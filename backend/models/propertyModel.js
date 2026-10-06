const pool = require("../config/db");

const PropertyModel = {
    async getAll(organizationId) {
        const result = await pool.query(
            `SELECT * FROM properties
             WHERE organization_id = $1
             ORDER BY id`,
            [organizationId]
        );
        return result.rows;
    },

    async getById(id, organizationId) {
        const result = await pool.query(
            `SELECT * FROM properties
             WHERE id = $1 AND organization_id = $2`,
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
             WHERE id = $2 AND organization_id = $3
             RETURNING *`,
            [name, id, organizationId]
        );
        return result.rows[0];
    },

    async delete(id, organizationId) {
        const result = await pool.query(
            `DELETE FROM properties
             WHERE id = $1 AND organization_id = $2
             RETURNING id`,
            [id, organizationId]
        );
        return result.rows[0];
    }
};

module.exports = PropertyModel;
