const pool = require("../config/db");
const { paginateQuery } = require("../utils/pagination");

const FloorModel = {
    async getByProperty(propertyId, organizationId, options = {}) {
        const values = [propertyId, organizationId];
        let fromWhere = `FROM floors f
             JOIN properties p ON f.property_id = p.id
             WHERE f.property_id = $1 AND p.organization_id = $2
               AND f.archived_at IS NULL AND p.archived_at IS NULL`;
        if (options.search) {
            values.push(`%${options.search}%`);
            fromWhere += ` AND f.name ILIKE $${values.length}`;
        }
        return paginateQuery(pool, {
            select: "SELECT f.id, f.property_id, f.name, f.created_at, f.updated_at",
            fromWhere,
            values,
            ...options,
            sortColumns: { id: "f.id", name: "f.name", created_at: "f.created_at" },
            tieColumn: "f.id",
        });
    },

    async getById(id, organizationId) {
        const result = await pool.query(
            `SELECT f.* FROM floors f
             JOIN properties p ON f.property_id = p.id
             WHERE f.id = $1 AND p.organization_id = $2
               AND f.archived_at IS NULL AND p.archived_at IS NULL`,
            [id, organizationId]
        );
        return result.rows[0];
    },

    async create(propertyId, name, organizationId) {
        // Verify property belongs to this organization
        const check = await pool.query(
            `SELECT id FROM properties
             WHERE id = $1 AND organization_id = $2 AND archived_at IS NULL`,
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
             WHERE id = $2 AND archived_at IS NULL AND property_id IN (
                 SELECT id FROM properties WHERE organization_id = $3 AND archived_at IS NULL
             )
             RETURNING *`,
            [name, id, organizationId]
        );
        return result.rows[0];
    },

    async delete(id, organizationId) {
        const result = await pool.query(
            `UPDATE floors SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND archived_at IS NULL AND property_id IN (
                 SELECT id FROM properties WHERE organization_id = $2 AND archived_at IS NULL
             )
             RETURNING id`,
            [id, organizationId]
        );
        return result.rows[0];
    }
};

module.exports = FloorModel;
