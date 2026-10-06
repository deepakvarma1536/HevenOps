const pool = require("../config/db");

const OrganizationModel = {
    async getByUser(userId) {
        const result = await pool.query(
            `SELECT o.*, om.role
             FROM organizations o
             JOIN organization_members om ON o.id = om.organization_id
             WHERE om.user_id = $1
             ORDER BY o.id`,
            [userId]
        );
        return result.rows;
    },

    async getById(id) {
        const result = await pool.query(
            `SELECT * FROM organizations WHERE id = $1`,
            [id]
        );
        return result.rows[0];
    },

    async update(id, name) {
        const result = await pool.query(
            `UPDATE organizations SET name = $1
             WHERE id = $2
             RETURNING *`,
            [name, id]
        );
        return result.rows[0];
    },

    async delete(id) {
        const result = await pool.query(
            `DELETE FROM organizations WHERE id = $1
             RETURNING id`,
            [id]
        );
        return result.rows[0];
    }
};

module.exports = OrganizationModel;
