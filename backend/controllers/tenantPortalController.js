const pool = require('../config/db');
const { paginateQuery } = require("../utils/pagination");

const tenantPortalController = {
    // GET /api/tenant-portal/me
    getProfile: async (req, res) => {
        try {
            const { tenantId, organizationId } = req.tenant;

            const result = await pool.query(
                `SELECT id, name, email, phone, government_id, emergency_contact, status, is_active, created_at
                 FROM tenants
                 WHERE id = $1 AND organization_id = $2 AND archived_at IS NULL`,
                [tenantId, organizationId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "Tenant profile not found" });
            }

            res.json(result.rows[0]);
        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "tenant profile fetch failed");
            res.status(500).json({ error: "Internal server error" });
        }
    },

    // PUT /api/tenant-portal/me
    updateProfile: async (req, res) => {
        try {
            const { tenantId, organizationId } = req.tenant;
            const { name, phone, emergency_contact } = req.body;

            // Only allow updating safe fields
            const result = await pool.query(
                `UPDATE tenants 
                 SET name = COALESCE($1, name),
                     phone = COALESCE($2, phone),
                     emergency_contact = COALESCE($3, emergency_contact),
                     updated_at = NOW()
                 WHERE id = $4 AND organization_id = $5 AND archived_at IS NULL
                 RETURNING id, name, email, phone, emergency_contact`,
                [name, phone, emergency_contact, tenantId, organizationId]
            );

            res.json({ message: "Profile updated successfully", profile: result.rows[0] });
        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "tenant profile update failed");
            res.status(500).json({ error: "Internal server error" });
        }
    },

    // GET /api/tenant-portal/my-stay
    getMyStay: async (req, res) => {
        try {
            const { tenantId, organizationId } = req.tenant;

            // Get the current active stay along with property, room, and bed info
            const query = `
                SELECT 
                    s.id as stay_id,
                    s.move_in_date,
                    s.move_out_date,
                    CASE WHEN s.move_out_date IS NULL THEN 'ACTIVE' ELSE 'CHECKED_OUT' END as stay_status,
                    b.bed_number,
                    b.monthly_rent_paise,
                    r.room_number,
                    r.room_type,
                    p.name as property_name,
                    p.address as property_address
                FROM stays s
                JOIN beds b ON s.bed_id = b.id
                JOIN rooms r ON b.room_id = r.id
                JOIN floors f ON r.floor_id = f.id
                JOIN properties p ON f.property_id = p.id
                WHERE s.tenant_id = $1 AND s.organization_id = $2
                  AND s.move_out_date IS NULL
                  AND p.archived_at IS NULL AND f.archived_at IS NULL
                  AND r.archived_at IS NULL AND b.archived_at IS NULL
                ORDER BY s.move_in_date DESC
                LIMIT 1
            `;

            const result = await pool.query(query, [tenantId, organizationId]);

            if (result.rows.length === 0) {
                return res.json({ stay: null, message: "No active stay found." });
            }

            res.json(result.rows[0]);
        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "tenant stay fetch failed");
            res.status(500).json({ error: "Internal server error" });
        }
    },

    // GET /api/tenant-portal/my-rent-dues
    getMyRentDues: async (req, res) => {
        try {
            const { tenantId, organizationId } = req.tenant;

            // Get all rent dues for the tenant across all their stays
            let fromWhere = `
                FROM rent_dues rd
                JOIN stays s ON rd.stay_id = s.id
                JOIN beds b ON s.bed_id = b.id
                JOIN rooms r ON b.room_id = r.id
                JOIN floors f ON r.floor_id = f.id
                JOIN properties p ON f.property_id = p.id
                WHERE s.tenant_id = $1 AND s.organization_id = $2`;
            const values = [tenantId, organizationId];
            if (req.listOptions.status) {
                values.push(req.listOptions.status);
                fromWhere += ` AND rd.status = $${values.length}`;
            }
            const result = await paginateQuery(pool, {
                select: `SELECT
                    rd.id,
                    rd.stay_id,
                    rd.due_month,
                    rd.amount_paise AS amount_due_paise,
                    COALESCE((SELECT SUM(pmt.amount_paise) FROM payments pmt WHERE pmt.rent_due_id = rd.id), 0) -
                    COALESCE((SELECT SUM(pr.amount_paise) FROM payment_reversals pr JOIN payments reversed_payment ON reversed_payment.id = pr.payment_id WHERE reversed_payment.rent_due_id = rd.id), 0)
                        AS amount_paid_paise,
                    rd.status,
                    rd.due_date,
                    b.bed_number,
                    p.name AS property_name`,
                fromWhere,
                values,
                ...req.listOptions,
                sortColumns: {
                    id: "rd.id",
                    due_date: "rd.due_date",
                    due_month: "rd.due_month",
                    amount_paise: "rd.amount_paise",
                    status: "rd.status",
                },
                tieColumn: "rd.id",
            });
            res.json(result);
        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "tenant rent due list failed");
            res.status(500).json({ error: "Internal server error" });
        }
    },

    // GET /api/tenant-portal/my-payments
    getMyPayments: async (req, res) => {
        try {
            const { tenantId, organizationId } = req.tenant;

            let fromWhere = `
                FROM payments p
                JOIN rent_dues rd ON p.rent_due_id = rd.id
                JOIN stays s ON rd.stay_id = s.id
                WHERE s.tenant_id = $1 AND s.organization_id = $2`;
            const values = [tenantId, organizationId];
            if (req.listOptions.payment_method) {
                values.push(req.listOptions.payment_method);
                fromWhere += ` AND p.payment_method = $${values.length}`;
            }
            const result = await paginateQuery(pool, {
                select: `SELECT
                    p.id,
                    p.rent_due_id,
                    p.amount_paise,
                    p.payment_date,
                    p.payment_method,
                    p.reference AS transaction_reference,
                    NULL::TEXT AS notes,
                    rd.due_month`,
                fromWhere,
                values,
                ...req.listOptions,
                sortColumns: {
                    id: "p.id",
                    payment_date: "p.payment_date",
                    amount_paise: "p.amount_paise",
                    payment_method: "p.payment_method",
                },
                tieColumn: "p.id",
            });
            res.json(result);
        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "tenant payment list failed");
            res.status(500).json({ error: "Internal server error" });
        }
    },

    // GET /api/tenant-portal/my-deposits
    getMyDeposits: async (req, res) => {
        try {
            const { tenantId, organizationId } = req.tenant;

            let fromWhere = `
                FROM deposit_transactions dt
                JOIN stays s ON dt.stay_id = s.id
                WHERE s.tenant_id = $1 AND s.organization_id = $2`;
            const values = [tenantId, organizationId];
            if (req.listOptions.transaction_type) {
                values.push(req.listOptions.transaction_type);
                fromWhere += ` AND dt.transaction_type = $${values.length}`;
            }
            const result = await paginateQuery(pool, {
                select: `SELECT
                    dt.id,
                    dt.stay_id,
                    dt.transaction_type,
                    dt.amount_paise,
                    dt.transaction_date,
                    NULL::VARCHAR(30) AS payment_method,
                    NULL::VARCHAR(100) AS reference_number,
                    dt.note AS notes`,
                fromWhere,
                values,
                ...req.listOptions,
                sortColumns: {
                    id: "dt.id",
                    transaction_date: "dt.transaction_date",
                    amount_paise: "dt.amount_paise",
                    transaction_type: "dt.transaction_type",
                },
                tieColumn: "dt.id",
            });
            res.json(result);
        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "tenant deposit list failed");
            res.status(500).json({ error: "Internal server error" });
        }
    }
};

module.exports = tenantPortalController;
