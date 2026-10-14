const pool = require("../config/db");
const { paginateQuery } = require("../utils/pagination");

const PropertyModel = {
    async getAll(organizationId, options = {}) {
        const values = [organizationId];
        let fromWhere = "FROM properties p WHERE p.organization_id = $1 AND p.archived_at IS NULL";
        if (options.search) {
            values.push(`%${options.search}%`);
            fromWhere += ` AND p.name ILIKE $${values.length}`;
        }
        return paginateQuery(pool, {
            select: "SELECT p.id, p.organization_id, p.name, p.address, p.created_at, p.updated_at",
            fromWhere,
            values,
            ...options,
            sortColumns: { id: "p.id", name: "p.name", created_at: "p.created_at" },
            tieColumn: "p.id",
        });
    },

    async getById(id, organizationId) {
        const result = await pool.query(
            `SELECT * FROM properties
             WHERE id = $1 AND organization_id = $2 AND archived_at IS NULL`,
            [id, organizationId]
        );
        return result.rows[0];
    },

    async create(organizationId, name) {
        const result = await pool.query(
            `INSERT INTO properties (organization_id, name)
             VALUES ($1, $2)
             RETURNING *`,
            [organizationId, name]
        );
        return result.rows[0];
    },

    async update(id, organizationId, name) {
        const result = await pool.query(
            `UPDATE properties SET name = $1
             WHERE id = $2 AND organization_id = $3 AND archived_at IS NULL
             RETURNING *`,
            [name, id, organizationId]
        );
        return result.rows[0];
    },

    async delete(id, organizationId) {
        const result = await pool.query(
            `UPDATE properties SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND organization_id = $2 AND archived_at IS NULL
             RETURNING id`,
            [id, organizationId]
        );
        return result.rows[0];
    }
};

module.exports = PropertyModel;
