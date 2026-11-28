const pool = require("../config/db");
const { paginateQuery } = require("../utils/pagination");
const { ApiError } = require("../utils/apiError");
const { rentDueBalanceJoin } = require("./rentDueBalance");
const { ensureRentCycles } = require("./scheduledRent");

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
            LEFT JOIN apartments a ON a.id = r.apartment_id
            JOIN floors f ON r.floor_id = f.id
            JOIN properties p ON f.property_id = p.id
            WHERE s.organization_id = $1
              AND t.archived_at IS NULL AND b.archived_at IS NULL
              AND r.archived_at IS NULL AND f.archived_at IS NULL AND p.archived_at IS NULL`;
        if (options.managerId) {
            values.push(options.managerId);
            fromWhere += ` AND EXISTS (SELECT 1 FROM manager_properties mp
                WHERE mp.organization_id = s.organization_id AND mp.user_id = $${values.length}
                  AND mp.property_id = p.id)`;
        }
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
                to_char(s.move_in_date, 'YYYY-MM-DD') AS move_in_date,
                to_char(s.move_out_date, 'YYYY-MM-DD') AS move_out_date,
                to_char(s.planned_move_out_date, 'YYYY-MM-DD') AS planned_move_out_date,
                s.planned_move_out_date - CURRENT_DATE AS days_until_planned_move_out,
                CASE WHEN s.move_out_date IS NULL THEN 'ACTIVE' ELSE 'CHECKED_OUT' END AS status,
                s.created_at, t.name AS tenant_name, t.phone AS tenant_phone,
                b.bed_number, (SELECT rp.monthly_rent_paise FROM stay_rate_plans rp WHERE rp.stay_id = s.id AND rp.effective_from <= CURRENT_DATE
                    AND (rp.effective_to IS NULL OR rp.effective_to >= CURRENT_DATE)
                    ORDER BY rp.effective_from DESC LIMIT 1) AS monthly_rent_paise, r.room_number, a.name AS apartment_name, f.name AS floor_name, p.name AS property_name, p.id AS property_id`,
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
                to_char(s.planned_move_out_date, 'YYYY-MM-DD') AS planned_move_out_date,
                s.planned_move_out_date - CURRENT_DATE AS days_until_planned_move_out,
                s.created_at,
                t.name AS tenant_name,
                t.phone AS tenant_phone,
                b.bed_number,
                b.status AS bed_status,
                r.room_number,
                a.name AS apartment_name,
                f.name AS floor_name,
                p.name AS property_name, p.id AS property_id
            FROM stays s
            JOIN tenants t ON s.tenant_id = t.id
            JOIN beds b ON s.bed_id = b.id
            JOIN rooms r ON b.room_id = r.id
            LEFT JOIN apartments a ON a.id = r.apartment_id
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
                 FOR UPDATE OF b`,
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
            await ensureRentCycles(client, [stayResult.rows[0].id]);

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
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const { rows: [stay] } = await client.query(
                `SELECT move_in_date = $3::date AS same_date,
                        planned_move_out_date < $3::date AS notice_before_move_in
                 FROM stays WHERE id = $1 AND organization_id = $2 AND move_out_date IS NULL
                 FOR NO KEY UPDATE`,
                [id, organizationId, moveInDate]
            );
            let result;
            if (stay) {
                if (stay.notice_before_move_in) {
                    throw new ApiError(409, "MOVE_IN_AFTER_NOTICE", "Update the planned move-out date before moving check-in past it.");
                }
                if (!stay.same_date) {
                    const billed = await client.query(
                        "SELECT 1 FROM rent_dues WHERE stay_id = $1 AND billing_cycle IS NOT NULL LIMIT 1", [id]
                    );
                    if (billed.rowCount) {
                        throw new ApiError(409, "RENT_CYCLE_ALREADY_BILLED", "The move-in date cannot be changed after rent has been billed on this stay.");
                    }
                    await client.query(
                        `UPDATE stay_rate_plans SET effective_from = $1
                         WHERE stay_id = $2 AND effective_from = (SELECT move_in_date FROM stays WHERE id = $2)
                           AND $1 < effective_from`,
                        [moveInDate, id]
                    );
                }
                const updated = await client.query("UPDATE stays SET move_in_date = $1 WHERE id = $2 RETURNING *", [moveInDate, id]);
                result = updated.rows[0];
                await ensureRentCycles(client, [id]);
            }
            await client.query("COMMIT");
            return result;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    async setPlannedMoveOut(id, organizationId, date) {
        const { rows: [notice] } = await pool.query(
            `WITH active AS (
                SELECT id, ($3::date IS NULL OR $3::date >= GREATEST(CURRENT_DATE, move_in_date)) AS valid_date
                FROM stays WHERE id = $1 AND organization_id = $2 AND move_out_date IS NULL
                FOR NO KEY UPDATE
            ), saved AS (
                UPDATE stays s SET planned_move_out_date = $3::date
                FROM active WHERE s.id = active.id AND active.valid_date
                RETURNING s.id, s.planned_move_out_date
            )
            SELECT active.id, active.valid_date, to_char(saved.planned_move_out_date, 'YYYY-MM-DD') AS planned_move_out_date
            FROM active LEFT JOIN saved USING (id)`,
            [id, organizationId, date]
        );

        if (!notice) throw new ApiError(404, "NOT_FOUND", "Active stay not found.");
        if (!notice.valid_date) {
            throw new ApiError(400, "INVALID_PLANNED_MOVE_OUT", "Choose a planned move-out date on or after today and the move-in date.");
        }
        return { id: notice.id, planned_move_out_date: notice.planned_move_out_date };
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
        let remaining;
        let checkedOutStay;
        try {
            await client.query("BEGIN");

            // 1. Verify stay exists, is active, and lock it
            const stayResult = await client.query(
                `SELECT id, bed_id, COALESCE($3::date, CURRENT_DATE) < move_in_date AS before_move_in
                 FROM stays
                 WHERE id = $1
                   AND organization_id = $2
                   AND move_out_date IS NULL
                 FOR NO KEY UPDATE`,
                [id, organizationId, moveOutDate]
            );
            if (stayResult.rows.length === 0) {
                throw new Error("STAY_NOT_FOUND_OR_ALREADY_ENDED");
            }

            if (stayResult.rows[0].before_move_in) {
                throw new Error("MOVE_OUT_BEFORE_MOVE_IN");
            }

            await ensureRentCycles(client, [id], moveOutDate);
            // Lock dues before reading payments so checkout sees any in-flight payment or reversal.
            await client.query("SELECT id FROM rent_dues WHERE stay_id = $1 ORDER BY id FOR UPDATE", [id]);
            const balance = await client.query(
                `SELECT COALESCE(SUM(rd.amount_paise - balance.net_paid), 0) AS remaining_paise
                 FROM rent_dues rd
                 ${rentDueBalanceJoin}
                 WHERE rd.stay_id = $1 AND rd.amount_paise > balance.net_paid`,
                [id]
            );
            remaining = balance.rows[0].remaining_paise;
            if (remaining === "0") {
                const updatedStay = await client.query(
                    `UPDATE stays SET move_out_date = COALESCE($1::date, CURRENT_DATE), planned_move_out_date = NULL
                     WHERE id = $2 RETURNING *`,
                    [moveOutDate, id]
                );
                checkedOutStay = updatedStay.rows[0];
                await client.query("UPDATE beds SET status = 'VACANT' WHERE id = $1", [stayResult.rows[0].bed_id]);
            }

            await client.query("COMMIT");

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
        if (!checkedOutStay) {
            throw new ApiError(409, "OUTSTANDING_RENT", "Record the outstanding rent payment before checking out.", {
                amount_remaining_paise: remaining,
            });
        }
        return checkedOutStay;
    }
};

module.exports = StayModel;
