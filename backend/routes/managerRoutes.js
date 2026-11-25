const express = require("express");
const { randomBytes, createHash } = require("node:crypto");
const bcrypt = require("bcrypt");
const { z } = require("zod");
const pool = require("../config/db");
const { authorize } = require("../middleware/authorize");
const validate = require("../middleware/validateRequest");
const { ApiError } = require("../utils/apiError");
const { request, id } = require("../utils/requestSchemas");

const router = express.Router();
const owner = authorize("*");
const inviteBody = request({ body: z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(150).toLowerCase(),
    propertyId: id,
}).strict() });
const assignments = request({
    params: z.object({ id }),
    body: z.object({ propertyIds: z.array(id).max(100) }).strict(),
});
const acceptBody = request({ body: z.object({
    token: z.string().regex(/^[a-f0-9]{64}$/),
    password: z.string().min(8).refine((password) => Buffer.byteLength(password) <= 72, "Password cannot exceed 72 bytes"),
}).strict() });

const hash = (token) => createHash("sha256").update(token).digest("hex");

async function transaction(run) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await run(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

router.get("/", owner, async (req, res) => {
    const { rows } = await pool.query(
        `SELECT u.id, u.name, u.email, COALESCE(array_agg(mp.property_id ORDER BY mp.property_id)
          FILTER (WHERE p.id IS NOT NULL), '{}') AS "propertyIds"
          FROM organization_members om JOIN users u ON u.id = om.user_id
          LEFT JOIN manager_properties mp ON mp.organization_id = om.organization_id AND mp.user_id = om.user_id
          LEFT JOIN properties p ON p.id = mp.property_id AND p.archived_at IS NULL
          WHERE om.organization_id = $1 AND om.role = 'manager'
          GROUP BY u.id ORDER BY u.name, u.id`, [req.user.organizationId]
    );
    res.json(rows);
});

router.post("/invites", owner, validate(inviteBody), async (req, res) => {
    const { name, email, propertyId } = req.validated.body;
    const token = randomBytes(32).toString("hex");
    const { rows } = await pool.query(
        `INSERT INTO manager_invites (token_hash, organization_id, property_id, name, email)
         SELECT $1, p.organization_id, p.id, $3, $4 FROM properties p
         WHERE p.organization_id = $2 AND p.id = $5 AND p.archived_at IS NULL
           AND NOT EXISTS (SELECT FROM users WHERE lower(email) = $4::varchar)
         ON CONFLICT (organization_id, email) DO UPDATE
         SET token_hash = EXCLUDED.token_hash, property_id = EXCLUDED.property_id,
             name = EXCLUDED.name, expires_at = EXCLUDED.expires_at
         RETURNING expires_at`, [hash(token), req.user.organizationId, name, email, propertyId]
    );
    if (!rows.length) throw new ApiError(409, "INVITE_UNAVAILABLE", "Select an active property and an email without a staff account");
    res.set("Cache-Control", "no-store").status(201).json({ token, expiresAt: rows[0].expires_at });
});

router.put("/:id/properties", owner, validate(assignments), async (req, res) => {
    const organization = req.user.organizationId;
    const manager = req.validated.params.id;
    const properties = [...new Set(req.validated.body.propertyIds)];
    await transaction(async (client) => {
        const membership = await client.query(
            "SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2 AND role = 'manager' FOR UPDATE",
            [organization, manager]
        );
        if (!membership.rowCount) throw new ApiError(404, "NOT_FOUND", "Manager not found");
        const valid = await client.query(
            "SELECT id FROM properties WHERE organization_id = $1 AND id = ANY($2::bigint[]) AND archived_at IS NULL FOR KEY SHARE",
            [organization, properties]
        );
        if (valid.rowCount !== properties.length) throw new ApiError(404, "NOT_FOUND", "One or more properties were not found");
        await client.query("DELETE FROM manager_properties WHERE organization_id = $1 AND user_id = $2", [organization, manager]);
        await client.query(
            "INSERT INTO manager_properties (organization_id, user_id, property_id) SELECT $1, $2, unnest($3::bigint[])",
            [organization, manager, properties]
        );
    });
    res.json({ propertyIds: properties });
});

async function acceptInvite(req, res) {
    const { token, password } = req.validated.body;
    const digest = hash(token);
    const passwordHash = await bcrypt.hash(password, 10);
    await transaction(async (client) => {
        const { rows: [invite] } = await client.query(
            `DELETE FROM manager_invites mi USING organizations o, properties p
             WHERE mi.token_hash = $1 AND mi.expires_at > now() AND mi.organization_id = o.id
               AND mi.property_id = p.id AND o.archived_at IS NULL AND p.archived_at IS NULL
             RETURNING mi.organization_id, mi.property_id, mi.name, mi.email`, [digest]
        );
        if (!invite) throw new ApiError(400, "INVITE_INVALID", "This invitation is invalid or has expired");
        const user = await client.query(
            "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id",
            [invite.name, invite.email, passwordHash]
        );
        if (!user.rowCount) throw new ApiError(409, "EMAIL_IN_USE", "This email already has a staff account");
        const { id: userId } = user.rows[0];
        await client.query(
            "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'manager')",
            [invite.organization_id, userId]
        );
        await client.query(
            "INSERT INTO manager_properties (organization_id, user_id, property_id) VALUES ($1, $2, $3)",
            [invite.organization_id, userId, invite.property_id]
        );
    });
    res.status(204).end();
}

module.exports = { managerRoutes: router, acceptManagerInvite: [validate(acceptBody), acceptInvite] };
