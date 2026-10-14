const pool = require("../config/db");
const { paginateQuery } = require("../utils/pagination");

const RoomModel = {
    async getByFloor(floorId, organizationId, options = {}) {
        const values = [floorId, organizationId];
        let fromWhere = `FROM rooms r
             JOIN floors f ON r.floor_id = f.id
             JOIN properties p ON f.property_id = p.id
             WHERE r.floor_id = $1 AND p.organization_id = $2
               AND r.archived_at IS NULL AND f.archived_at IS NULL AND p.archived_at IS NULL`;
        if (options.search) {
            values.push(`%${options.search}%`);
            fromWhere += ` AND r.room_number ILIKE $${values.length}`;
        }
        if (options.room_type) {
            values.push(options.room_type);
            fromWhere += ` AND r.room_type = $${values.length}`;
        }
        return paginateQuery(pool, {
            select: "SELECT r.id, r.floor_id, r.room_number, r.room_type, r.created_at, r.updated_at",
            fromWhere,
            values,
            ...options,
            sortColumns: { id: "r.id", room_number: "r.room_number", room_type: "r.room_type", created_at: "r.created_at" },
            tieColumn: "r.id",
        });
    },

    async getById(id, organizationId) {
        const result = await pool.query(
            `SELECT r.* FROM rooms r
             JOIN floors f ON r.floor_id = f.id
             JOIN properties p ON f.property_id = p.id
             WHERE r.id = $1 AND p.organization_id = $2
               AND r.archived_at IS NULL AND f.archived_at IS NULL AND p.archived_at IS NULL`,
            [id, organizationId]
        );
        return result.rows[0];
    },

    async create(floorId, roomNumber, roomType, organizationId) {
        // Verify floor belongs to this organization
        const check = await pool.query(
            `SELECT f.id FROM floors f
             JOIN properties p ON f.property_id = p.id
             WHERE f.id = $1 AND p.organization_id = $2
               AND f.archived_at IS NULL AND p.archived_at IS NULL`,
            [floorId, organizationId]
        );
        if (check.rows.length === 0) return null;

        const result = await pool.query(
            `INSERT INTO rooms (floor_id, room_number, room_type)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [floorId, roomNumber, roomType]
        );
        return result.rows[0];
    },

    async update(id, roomNumber, roomType, organizationId) {
        const result = await pool.query(
            `UPDATE rooms SET room_number = $1, room_type = $2
             WHERE id = $3 AND archived_at IS NULL AND floor_id IN (
                 SELECT f.id FROM floors f
                 JOIN properties p ON f.property_id = p.id
                 WHERE p.organization_id = $4 AND f.archived_at IS NULL AND p.archived_at IS NULL
             )
             RETURNING *`,
            [roomNumber, roomType, id, organizationId]
        );
        return result.rows[0];
    },

    async delete(id, organizationId) {
        const result = await pool.query(
            `UPDATE rooms SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND archived_at IS NULL AND floor_id IN (
                 SELECT f.id FROM floors f
                 JOIN properties p ON f.property_id = p.id
                 WHERE p.organization_id = $2 AND f.archived_at IS NULL AND p.archived_at IS NULL
             )
             RETURNING id`,
            [id, organizationId]
        );
        return result.rows[0];
    }
};

module.exports = RoomModel;
