const pool = require("../config/db");
const { paginateQuery } = require("../utils/pagination");

const OrganizationModel = {
    async getByUser(userId, options = {}) {
        const values = [userId];
        let fromWhere = `FROM organizations o
             JOIN organization_members om ON o.id = om.organization_id
             WHERE om.user_id = $1 AND o.archived_at IS NULL`;
        if (options.search) {
            values.push(`%${options.search}%`);
            fromWhere += ` AND o.name ILIKE $${values.length}`;
        }
        return paginateQuery(pool, {
            select: `SELECT o.id, o.name, o.created_at, o.updated_at, om.role`,
            fromWhere,
            values,
            ...options,
            sortColumns: { id: "o.id", name: "o.name", created_at: "o.created_at" },
            tieColumn: "o.id",
        });
    },

    async getById(id, userId) {
        const result = await pool.query(
            `SELECT o.*, om.role
             FROM organizations o
             JOIN organization_members om ON om.organization_id = o.id
             WHERE o.id = $1 AND om.user_id = $2 AND o.archived_at IS NULL`,
            [id, userId]
        );
        return result.rows[0];
    },

    async update(id, organizationId, name) {
        const result = await pool.query(
            `UPDATE organizations SET name = $1
             WHERE id = $2 AND id = $3 AND archived_at IS NULL
             RETURNING *`,
            [name, id, organizationId]
        );
        return result.rows[0];
    },

    async delete(id, organizationId) {
        const result = await pool.query(
            `UPDATE organizations SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND id = $2 AND archived_at IS NULL
             RETURNING id`,
            [id, organizationId]
        );
        return result.rows[0];
    }
};

module.exports = OrganizationModel;
