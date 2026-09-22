const pool = require("../config/db");

const BedModel = {
    async getByRoom(roomId) {
        const result = await pool.query(
            `SELECT *
             FROM beds
             WHERE room_id = $1
             ORDER BY id`,
            [roomId]
        );
        return result.rows;
    }
};

module.exports = BedModel;
