const pool = require("../config/db");
const { paginateQuery } = require("../utils/pagination");

const TenantModel = {
    async getAll(organizationId, options = {}) {
        const values = [organizationId];
        let fromWhere = "FROM tenants t WHERE t.organization_id = $1 AND t.archived_at IS NULL";
        if (options.search) {
            values.push(`%${options.search}%`);
            fromWhere += ` AND (t.name ILIKE $${values.length} OR t.phone ILIKE $${values.length} OR t.email ILIKE $${values.length})`;
        }
        if (options.is_active) {
            values.push(options.is_active === "true");
            fromWhere += ` AND t.is_active = $${values.length}`;
        }
        return paginateQuery(pool, {
            select: "SELECT t.id, t.organization_id, t.name, t.phone, t.email, t.government_id, t.emergency_contact, t.is_active, t.created_at, t.updated_at",
            fromWhere,
            values,
            ...options,
            sortColumns: { id: "t.id", name: "t.name", phone: "t.phone", email: "t.email", created_at: "t.created_at" },
            tieColumn: "t.id",
        });
    },

    async getById(id, organizationId) {
        const result = await pool.query(
            `SELECT id, organization_id, name, phone, email, government_id,
                    emergency_contact, is_active, created_at, updated_at
             FROM tenants
             WHERE id = $1 AND organization_id = $2 AND archived_at IS NULL`,
            [id, organizationId]
        );
        return result.rows[0];
    },

    async create(organizationId, name, phone, email) {
        const result = await pool.query(
            `INSERT INTO tenants (organization_id, name, phone, email)
             VALUES ($1, $2, $3, $4)
             RETURNING id, organization_id, name, phone, email, government_id,
                       emergency_contact, is_active, created_at, updated_at`,
            [organizationId, name, phone, email]
        );
        return result.rows[0];
    },

    async update(id, organizationId, name, phone, email) {
        const result = await pool.query(
            `UPDATE tenants SET name = $1, phone = $2, email = $3
             WHERE id = $4 AND organization_id = $5 AND archived_at IS NULL
             RETURNING id, organization_id, name, phone, email, government_id,
                       emergency_contact, is_active, created_at, updated_at`,
            [name, phone, email, id, organizationId]
        );
        return result.rows[0];
    },

    async delete(id, organizationId) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // Check for active stays — prevent deletion if tenant has an open stay
            const activeStay = await client.query(
                `SELECT id FROM stays
                 WHERE tenant_id = $1 AND organization_id = $2 AND move_out_date IS NULL
                 LIMIT 1`,
                [id, organizationId]
            );
            if (activeStay.rows.length > 0) {
                throw new Error("TENANT_HAS_ACTIVE_STAY");
            }

            const result = await client.query(
                `UPDATE tenants SET archived_at = CURRENT_TIMESTAMP, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND organization_id = $2 AND archived_at IS NULL
                 RETURNING id`,
                [id, organizationId]
            );

            await client.query("COMMIT");
            return result.rows[0];

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = TenantModel;
