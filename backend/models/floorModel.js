const pool = require("../config/db");

const FloorModel = {
    async getByProperty(propertyId) {
        const result = await pool.query(
            `SELECT *
             FROM floors
             WHERE property_id = $1
             ORDER BY id`,
            [propertyId]
        );
        return result.rows;
    }
};

module.exports = FloorModel;
