const pool = require("../config/db");
const { paginateQuery } = require("../utils/pagination");
const { withLockedInventory, requireUniqueName, deleteInventory } = require("./propertyInventory");

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
        return withLockedInventory("property", propertyId, organizationId, async (client, property) => {
            await requireUniqueName(client, "floor", property.property_id, name);
            const result = await client.query(
                "INSERT INTO floors (property_id, name) VALUES ($1, $2) RETURNING *",
                [property.property_id, name]
            );
            return result.rows[0];
        });
    },

    async update(id, name, organizationId) {
        return withLockedInventory("floor", id, organizationId, async (client, floor) => {
            if (name !== floor.name) await requireUniqueName(client, "floor", floor.property_id, name, floor.id);
            const result = await client.query("UPDATE floors SET name = $1 WHERE id = $2 RETURNING *", [name, floor.id]);
            return result.rows[0];
        });
    },

    delete(id, organizationId) {
        return deleteInventory("floor", id, organizationId);
    }
};

module.exports = FloorModel;
