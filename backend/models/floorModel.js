const pool = require("../config/db");

const FloorModel = {
    async getByProperty(propertyId, organizationId) {
        const result = await pool.query(
            `SELECT f.* FROM floors f
             JOIN properties p ON f.property_id = p.id
             WHERE f.property_id = $1 AND p.organization_id = $2
             ORDER BY f.id`,
            [propertyId, organizationId]
        );
        return result.rows;
    },

    async getById(id, organizationId) {
        const result = await pool.query(
            `SELECT f.* FROM floors f
             JOIN properties p ON f.property_id = p.id
             WHERE f.id = $1 AND p.organization_id = $2`,
            [id, organizationId]
        );
        return result.rows[0];
    },

    async create(propertyId, name, organizationId) {
        // Verify property belongs to this organization
        const check = await pool.query(
            `SELECT id FROM properties
             WHERE id = $1 AND organization_id = $2`,
            [propertyId, organizationId]
        );
        if (check.rows.length === 0) return null;

        const result = await pool.query(
            `INSERT INTO floors (property_id, name)
             VALUES ($1, $2)
             RETURNING *`,
            [propertyId, name]
        );
        return result.rows[0];
    },

    async update(id, name, organizationId) {
        const result = await pool.query(
            `UPDATE floors SET name = $1
             WHERE id = $2 AND property_id IN (
                 SELECT id FROM properties WHERE organization_id = $3
             )
             RETURNING *`,
            [name, id, organizationId]
        );
        return result.rows[0];
    },

    async delete(id, organizationId) {
        const result = await pool.query(
            `DELETE FROM floors
             WHERE id = $1 AND property_id IN (
                 SELECT id FROM properties WHERE organization_id = $2
             )
             RETURNING id`,
            [id, organizationId]
        );
        return result.rows[0];
    }
};

module.exports = FloorModel;
