const pool = require("../config/db");

const RoomModel = {
    async getByFloor(floorId) {
        const result = await pool.query(
            `SELECT *
             FROM rooms
             WHERE floor_id = $1
             ORDER BY id`,
            [floorId]
        );
        return result.rows;
    }
};

module.exports = RoomModel;
