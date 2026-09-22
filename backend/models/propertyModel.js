const pool = require("../config/db");

const PropertyModel = {
    async getByOrganization(organizationId) {
        const result = await pool.query(
            `SELECT *
             FROM properties
             WHERE organization_id = $1
             ORDER BY id`,
            [organizationId]
        );
        return result.rows;
    }
};

module.exports = PropertyModel;
