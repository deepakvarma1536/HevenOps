const pool = require("../config/db");

const StayModel = {
    async getAllWithDetails(organizationId) {
        const query = `
            SELECT 
                s.id,
                s.organization_id,
                s.move_in_date,
                s.move_out_date,
                s.created_at,
                t.id AS tenant_id,
                t.name AS tenant_name,
                t.phone AS tenant_phone,
                b.id AS bed_id,
                b.bed_number,
                r.room_number,
                f.name AS floor_name,
                p.name AS property_name
            FROM stays s
            JOIN tenants t ON s.tenant_id = t.id
            JOIN beds b ON s.bed_id = b.id
            JOIN rooms r ON b.room_id = r.id
            JOIN floors f ON r.floor_id = f.id
            JOIN properties p ON f.property_id = p.id
            WHERE s.organization_id = $1
            ORDER BY s.created_at DESC;
        `;
        const result = await pool.query(query, [organizationId]);
        return result.rows;
    }
};

module.exports = StayModel;
