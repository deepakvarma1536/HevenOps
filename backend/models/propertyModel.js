const pool = require("../config/db");
const { paginateQuery } = require("../utils/pagination");
const { deleteInventory } = require("./propertyInventory");

const PropertyModel = {
    async getAll(organizationId, options = {}) {
        const values = [organizationId];
        let fromWhere = "FROM properties p WHERE p.organization_id = $1 AND p.archived_at IS NULL";
        if (options.managerId) {
            values.push(options.managerId);
            fromWhere += ` AND EXISTS (SELECT 1 FROM manager_properties mp
                WHERE mp.organization_id = p.organization_id AND mp.user_id = $${values.length}
                  AND mp.property_id = p.id)`;
        }
        if (options.search) {
            values.push(`%${options.search}%`);
            fromWhere += ` AND (p.name ILIKE $${values.length} OR p.address ILIKE $${values.length})`;
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

    async create(organizationId, name, address = null) {
        const result = await pool.query(
            `INSERT INTO properties (organization_id, name, address)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [organizationId, name, address]
        );
        return result.rows[0];
    },

    async update(id, organizationId, name, address) {
        const result = await pool.query(
            `UPDATE properties SET name = $1, address = CASE WHEN $4 THEN $5 ELSE address END
             WHERE id = $2 AND organization_id = $3 AND archived_at IS NULL
             RETURNING *`,
            [name, id, organizationId, address !== undefined, address ?? null]
        );
        return result.rows[0];
    },

    delete(id, organizationId) {
        return deleteInventory("property", id, organizationId);
    }
};

module.exports = PropertyModel;
