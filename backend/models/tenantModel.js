const pool = require("../config/db");

const TenantModel = {
    async getAll() {
        const result = await pool.query(
            `SELECT *
             FROM tenants
             ORDER BY id`
        );
        return result.rows;
    }
};

module.exports = TenantModel;
