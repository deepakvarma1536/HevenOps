const pool = require("../config/db");
const { paginateQuery } = require("../utils/pagination");
const { ApiError } = require("../utils/apiError");

const columns = "id, amount_paise, description, created_at";

const SpendModel = {
    getAll(organizationId, options) {
        return paginateQuery(pool, {
            ...options,
            select: `SELECT ${columns}`,
            fromWhere: "FROM spends WHERE organization_id = $1",
            values: [organizationId],
            sortColumns: { id: "id" },
        });
    },

    async create(organizationId, { amount_paise, description }, idempotencyKey) {
        const result = await pool.query(
            `INSERT INTO spends (organization_id, amount_paise, description, idempotency_key)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (organization_id, idempotency_key) DO NOTHING
             RETURNING ${columns}`,
            [organizationId, amount_paise, description, idempotencyKey]
        );
        if (result.rows.length) return { spend: result.rows[0], wasCreated: true };

        const existing = await pool.query(
            `SELECT ${columns} FROM spends WHERE organization_id = $1 AND idempotency_key = $2`,
            [organizationId, idempotencyKey]
        );
        const spend = existing.rows[0];
        if (spend.amount_paise !== String(amount_paise) || spend.description !== description) {
            throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "This request key was already used for a different spend");
        }
        return { spend, wasCreated: false };
    },
};

module.exports = SpendModel;
