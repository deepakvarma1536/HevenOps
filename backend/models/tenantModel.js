const pool = require("../config/db");

const TenantModel = {
    async getAll(organizationId) {
        const result = await pool.query(
            `SELECT *
             FROM tenants
             WHERE organization_id = $1
             ORDER BY id`,
            [organizationId]
        );
        return result.rows;
    }
};

module.exports = TenantModel;
