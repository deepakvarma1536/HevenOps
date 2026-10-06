const pool = require("../config/db");

const BedModel = {
    async getByRoom(roomId, organizationId) {
        const result = await pool.query(
            `SELECT b.* FROM beds b
             JOIN rooms r ON b.room_id = r.id
             JOIN floors f ON r.floor_id = f.id
             JOIN properties p ON f.property_id = p.id
             WHERE b.room_id = $1 AND p.organization_id = $2
             ORDER BY b.id`,
            [roomId, organizationId]
        );
        return result.rows;
    },

    async getById(id, organizationId) {
        const result = await pool.query(
            `SELECT b.* FROM beds b
             JOIN rooms r ON b.room_id = r.id
             JOIN floors f ON r.floor_id = f.id
             JOIN properties p ON f.property_id = p.id
             WHERE b.id = $1 AND p.organization_id = $2`,
            [id, organizationId]
        );
        return result.rows[0];
    },

    async create(roomId, bedNumber, organizationId) {
        // Verify room belongs to this organization
        const check = await pool.query(
            `SELECT r.id FROM rooms r
             JOIN floors f ON r.floor_id = f.id
             JOIN properties p ON f.property_id = p.id
             WHERE r.id = $1 AND p.organization_id = $2`,
            [roomId, organizationId]
        );
        if (check.rows.length === 0) return null;

        const result = await pool.query(
            `INSERT INTO beds (room_id, bed_number)
             VALUES ($1, $2)
             RETURNING *`,
            [roomId, bedNumber]
        );
        return result.rows[0];
    },

    async updateStatus(id, status, organizationId) {
        const result = await pool.query(
            `UPDATE beds SET status = $1
             WHERE id = $2 AND room_id IN (
                 SELECT r.id FROM rooms r
                 JOIN floors f ON r.floor_id = f.id
                 JOIN properties p ON f.property_id = p.id
                 WHERE p.organization_id = $3
             )
             RETURNING *`,
            [status, id, organizationId]
        );
        return result.rows[0];
    },

    async delete(id, organizationId) {
        const result = await pool.query(
            `DELETE FROM beds
             WHERE id = $1 AND room_id IN (
                 SELECT r.id FROM rooms r
                 JOIN floors f ON r.floor_id = f.id
                 JOIN properties p ON f.property_id = p.id
                 WHERE p.organization_id = $2
             )
             RETURNING id`,
            [id, organizationId]
        );
        return result.rows[0];
    }
};

module.exports = BedModel;
