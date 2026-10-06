const pool = require("../config/db");

const TenantModel = {
    async getAll(organizationId) {
        const result = await pool.query(
            `SELECT * FROM tenants
             WHERE organization_id = $1
             ORDER BY id`,
            [organizationId]
        );
        return result.rows;
    },

    async getById(id, organizationId) {
        const result = await pool.query(
            `SELECT * FROM tenants
             WHERE id = $1 AND organization_id = $2`,
            [id, organizationId]
        );
        return result.rows[0];
    },

    async create(organizationId, name, phone, email) {
        const result = await pool.query(
            `INSERT INTO tenants (organization_id, name, phone, email)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [organizationId, name, phone, email]
        );
        return result.rows[0];
    },

    async update(id, organizationId, name, phone, email) {
        const result = await pool.query(
            `UPDATE tenants SET name = $1, phone = $2, email = $3
             WHERE id = $4 AND organization_id = $5
             RETURNING *`,
            [name, phone, email, id, organizationId]
        );
        return result.rows[0];
    }
};

module.exports = TenantModel;
