const pool = require("../config/db");
const { paginateQuery } = require("../utils/pagination");
const { ApiError } = require("../utils/apiError");

const columns = "id, amount_paise, description, created_at, property_id";

const SpendModel = {
    getAll(organizationId, options) {
        const values = [organizationId];
        let fromWhere = "FROM spends WHERE organization_id = $1";
        if (options.managerId) {
            values.push(options.managerId);
            fromWhere += ` AND EXISTS (SELECT 1 FROM manager_properties mp JOIN properties p ON p.id = mp.property_id
                WHERE mp.organization_id = spends.organization_id AND mp.user_id = $2
                  AND mp.property_id = spends.property_id AND p.archived_at IS NULL)`;
        }
        return paginateQuery(pool, {
            ...options,
            select: `SELECT ${columns}`,
            fromWhere,
            values,
            sortColumns: { id: "id" },
        });
    },

    async create(organizationId, { amount_paise, description, propertyId = null }, idempotencyKey) {
        const result = await pool.query(
            `INSERT INTO spends (organization_id, amount_paise, description, idempotency_key, property_id)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (organization_id, idempotency_key) DO NOTHING
             RETURNING ${columns}`,
            [organizationId, amount_paise, description, idempotencyKey, propertyId]
        );
        if (result.rows.length) return { spend: result.rows[0], wasCreated: true };

        const existing = await pool.query(
            `SELECT ${columns} FROM spends WHERE organization_id = $1 AND idempotency_key = $2`,
            [organizationId, idempotencyKey]
        );
        const spend = existing.rows[0];
        if (spend.amount_paise !== String(amount_paise) || spend.description !== description || spend.property_id !== propertyId) {
            throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "This request key was already used for a different spend");
        }
        return { spend, wasCreated: false };
    },
};

module.exports = SpendModel;
