const pool = require("../config/db");

const StayModel = {
    async getAllWithDetails() {
        const result = await pool.query(
            `SELECT
                stays.id AS stay_id,
                tenants.name AS tenant_name,
                beds.bed_number,
                rooms.room_number,
                stays.move_in_date,
                stays.move_out_date
             FROM stays
             JOIN tenants
                ON stays.tenant_id = tenants.id
             JOIN beds
                ON stays.bed_id = beds.id
             JOIN rooms
                ON beds.room_id = rooms.id
             ORDER BY stays.id`
        );
        return result.rows;
    }
};

module.exports = StayModel;
