const pool = require("../config/db");

const OrganizationModel = {
    async getAll() {
        const result = await pool.query(
            "SELECT * FROM organizations ORDER BY id"
        );
        return result.rows;
    }
};

module.exports = OrganizationModel;
