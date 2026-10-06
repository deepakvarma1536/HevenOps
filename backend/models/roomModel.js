const pool = require("../config/db");

const RoomModel = {
    async getByFloor(floorId, organizationId) {
        const result = await pool.query(
            `SELECT r.* FROM rooms r
             JOIN floors f ON r.floor_id = f.id
             JOIN properties p ON f.property_id = p.id
             WHERE r.floor_id = $1 AND p.organization_id = $2
             ORDER BY r.id`,
            [floorId, organizationId]
        );
        return result.rows;
    },

    async getById(id, organizationId) {
        const result = await pool.query(
            `SELECT r.* FROM rooms r
             JOIN floors f ON r.floor_id = f.id
             JOIN properties p ON f.property_id = p.id
             WHERE r.id = $1 AND p.organization_id = $2`,
            [id, organizationId]
        );
        return result.rows[0];
    },

    async create(floorId, roomNumber, roomType, organizationId) {
        // Verify floor belongs to this organization
        const check = await pool.query(
            `SELECT f.id FROM floors f
             JOIN properties p ON f.property_id = p.id
             WHERE f.id = $1 AND p.organization_id = $2`,
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
             WHERE id = $3 AND floor_id IN (
                 SELECT f.id FROM floors f
                 JOIN properties p ON f.property_id = p.id
                 WHERE p.organization_id = $4
             )
             RETURNING *`,
            [roomNumber, roomType, id, organizationId]
        );
        return result.rows[0];
    },

    async delete(id, organizationId) {
        const result = await pool.query(
            `DELETE FROM rooms
             WHERE id = $1 AND floor_id IN (
                 SELECT f.id FROM floors f
                 JOIN properties p ON f.property_id = p.id
                 WHERE p.organization_id = $2
             )
             RETURNING id`,
            [id, organizationId]
        );
        return result.rows[0];
    }
};

module.exports = RoomModel;
