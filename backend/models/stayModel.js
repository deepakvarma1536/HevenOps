const pool = require("../config/db");
const { paginateQuery } = require("../utils/pagination");

const StayModel = {
    /**
     * Fetch all stays with joined tenant, bed, room, floor, property details.
     * Scoped to a single organization.
     */
    async getAllWithDetails(organizationId, options = {}) {
        const values = [organizationId];
        let fromWhere = `FROM stays s
            JOIN tenants t ON s.tenant_id = t.id
            JOIN beds b ON s.bed_id = b.id
            JOIN rooms r ON b.room_id = r.id
            JOIN floors f ON r.floor_id = f.id
            JOIN properties p ON f.property_id = p.id
            WHERE s.organization_id = $1
              AND t.archived_at IS NULL AND b.archived_at IS NULL
              AND r.archived_at IS NULL AND f.archived_at IS NULL AND p.archived_at IS NULL`;
        if (options.tenantId) {
            values.push(options.tenantId);
            fromWhere += ` AND s.tenant_id = $${values.length}`;
        }
        if (options.active) {
            fromWhere += options.active === "true" ? " AND s.move_out_date IS NULL" : " AND s.move_out_date IS NOT NULL";
        }
        if (options.search) {
            values.push(`%${options.search}%`);
            fromWhere += ` AND (t.name ILIKE $${values.length} OR r.room_number ILIKE $${values.length} OR p.name ILIKE $${values.length})`;
        }
        return paginateQuery(pool, {
            select: `SELECT s.id, s.organization_id, s.tenant_id, s.bed_id,
                s.move_in_date, s.move_out_date,
                CASE WHEN s.move_out_date IS NULL THEN 'ACTIVE' ELSE 'CHECKED_OUT' END AS status,
                s.created_at, t.name AS tenant_name, t.phone AS tenant_phone,
                b.bed_number, r.room_number, f.name AS floor_name, p.name AS property_name`,
            fromWhere,
            values,
            ...options,
            sortColumns: {
                id: "s.id",
                move_in_date: "s.move_in_date",
                move_out_date: "s.move_out_date",
                created_at: "s.created_at",
                tenant_name: "t.name",
                property_name: "p.name",
            },
            tieColumn: "s.id",
        });
    },

    /**
     * Get a single stay by ID with full details.
     */
    async getByIdWithDetails(id, organizationId) {
        const result = await pool.query(
            `SELECT 
                s.id,
                s.organization_id,
                s.tenant_id,
                s.bed_id,
                s.move_in_date,
                s.move_out_date,
                s.created_at,
                t.name AS tenant_name,
                t.phone AS tenant_phone,
                b.bed_number,
                b.status AS bed_status,
                r.room_number,
                f.name AS floor_name,
                p.name AS property_name
            FROM stays s
            JOIN tenants t ON s.tenant_id = t.id
            JOIN beds b ON s.bed_id = b.id
            JOIN rooms r ON b.room_id = r.id
            JOIN floors f ON r.floor_id = f.id
            JOIN properties p ON f.property_id = p.id
            WHERE s.id = $1 AND s.organization_id = $2
              AND t.archived_at IS NULL AND b.archived_at IS NULL
              AND r.archived_at IS NULL AND f.archived_at IS NULL AND p.archived_at IS NULL`,
            [id, organizationId]
        );
        return result.rows[0];
    },

    /**
     * Create a new stay in a transaction:
     * 1. Verify tenant belongs to this organization
     * 2. Verify bed belongs to this organization and is VACANT
     * 3. Insert the stay record
     * 4. Mark the bed as OCCUPIED
     *
     * Throws coded errors for business rule violations.
     */
    async create(organizationId, tenantId, bedId, moveInDate, monthlyRentPaise) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // 1. Verify tenant belongs to this organization
            const tenantCheck = await client.query(
                `SELECT id FROM tenants
                 WHERE id = $1 AND organization_id = $2 AND archived_at IS NULL`,
                [tenantId, organizationId]
            );
            if (tenantCheck.rows.length === 0) {
                throw new Error("TENANT_NOT_FOUND");
            }

            // 2. Verify bed belongs to this organization and lock it
            const bedCheck = await client.query(
                `SELECT b.id, b.status
                 FROM beds b
                 JOIN rooms r ON b.room_id = r.id
                 JOIN floors f ON r.floor_id = f.id
                 JOIN properties p ON f.property_id = p.id
                 WHERE b.id = $1 AND p.organization_id = $2
                   AND b.archived_at IS NULL AND r.archived_at IS NULL
                   AND f.archived_at IS NULL AND p.archived_at IS NULL
                 FOR UPDATE`,
                [bedId, organizationId]
            );
            if (bedCheck.rows.length === 0) {
                throw new Error("BED_NOT_FOUND");
            }
            if (bedCheck.rows[0].status !== "VACANT") {
                throw new Error("BED_NOT_VACANT");
            }

            // 3. Check tenant doesn't already have an active stay
            const activeStayCheck = await client.query(
                `SELECT id FROM stays
                 WHERE tenant_id = $1 AND move_out_date IS NULL`,
                [tenantId]
            );
            if (activeStayCheck.rows.length > 0) {
                throw new Error("TENANT_HAS_ACTIVE_STAY");
            }

            // 4. Insert the stay
            const stayResult = await client.query(
                `INSERT INTO stays (organization_id, tenant_id, bed_id, move_in_date)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [organizationId, tenantId, bedId, moveInDate]
            );

            await client.query(
                `INSERT INTO stay_rate_plans (stay_id, effective_from, monthly_rent_paise)
                 VALUES ($1, $2, $3)`,
                [stayResult.rows[0].id, moveInDate, monthlyRentPaise]
            );

            // 5. Mark bed as OCCUPIED
            await client.query(
                `UPDATE beds SET status = 'OCCUPIED' WHERE id = $1`,
                [bedId]
            );

            await client.query("COMMIT");
            return stayResult.rows[0];

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Update a stay's move_in_date (only allowed while stay is active).
     */
    async update(id, organizationId, moveInDate) {
        const result = await pool.query(
            `UPDATE stays
             SET move_in_date = $1
             WHERE id = $2
               AND organization_id = $3
               AND move_out_date IS NULL
             RETURNING *`,
            [moveInDate, id, organizationId]
        );
        return result.rows[0];
    },

    async setRatePlan(id, organizationId, effectiveFrom, monthlyRentPaise) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const stay = await client.query(
                `SELECT id FROM stays WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
                [id, organizationId]
            );
            if (!stay.rows.length) throw new Error("STAY_NOT_FOUND");
            await client.query(
                `UPDATE stay_rate_plans SET effective_to = ($2::date - INTERVAL '1 day')::date
                 WHERE stay_id = $1 AND effective_to IS NULL AND effective_from < $2`,
                [id, effectiveFrom]
            );
            const result = await client.query(
                `INSERT INTO stay_rate_plans (stay_id, effective_from, monthly_rent_paise)
                 VALUES ($1, $2, $3) RETURNING *`, [id, effectiveFrom, monthlyRentPaise]
            );
            await client.query("COMMIT");
            return result.rows[0];
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally { client.release(); }
    },

    /**
     * Checkout (end) a stay in a transaction:
     * 1. Set move_out_date on the stay
     * 2. Mark the bed as VACANT
     */
    async checkout(id, organizationId, moveOutDate) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // 1. Verify stay exists, is active, and lock it
            const stayResult = await client.query(
                `SELECT id, bed_id, move_in_date FROM stays
                 WHERE id = $1
                   AND organization_id = $2
                   AND move_out_date IS NULL
                 FOR UPDATE`,
                [id, organizationId]
            );
            if (stayResult.rows.length === 0) {
                throw new Error("STAY_NOT_FOUND_OR_ALREADY_ENDED");
            }

            const moveInDate = String(stayResult.rows[0].move_in_date).slice(0, 10);
            if (moveOutDate < moveInDate) {
                throw new Error("MOVE_OUT_BEFORE_MOVE_IN");
            }

            const { bed_id } = stayResult.rows[0];

            // 2. Set move_out_date
            const updatedStay = await client.query(
                `UPDATE stays
                 SET move_out_date = $1
                 WHERE id = $2
                 RETURNING *`,
                [moveOutDate, id]
            );

            // 3. Mark bed as VACANT
            await client.query(
                `UPDATE beds SET status = 'VACANT' WHERE id = $1`,
                [bed_id]
            );

            await client.query("COMMIT");
            return updatedStay.rows[0];

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = StayModel;
