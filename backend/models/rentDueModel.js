const pool = require("../config/db");
const { paginateQuery } = require("../utils/pagination");

const RentDueModel = {
    /**
     * Get all rent dues for a specific stay, ordered by month.
     */
    async getByStay(stayId, organizationId, options = {}) {
        const values = [stayId, organizationId];
        let fromWhere = `FROM rent_dues rd
             JOIN stays s ON s.id = rd.stay_id
             WHERE rd.stay_id = $1 AND s.organization_id = $2
             `;
        if (options.status) {
            values.push(options.status);
            fromWhere += ` AND rd.status = $${values.length}`;
        }
        return paginateQuery(pool, {
            select: `SELECT rd.id, rd.stay_id, to_char(rd.due_month, 'YYYY-MM-DD') AS due_month,
                rd.amount_paise, to_char(rd.due_date, 'YYYY-MM-DD') AS due_date,
                rd.status, rd.created_at, rd.updated_at`,
            fromWhere,
            values,
            ...options,
            sortColumns: { id: "rd.id", due_month: "rd.due_month", due_date: "rd.due_date", amount_paise: "rd.amount_paise", status: "rd.status" },
            tieColumn: "rd.id",
        });
    },

    /**
     * Get a summary of a rent due with payment totals.
     */
    async getSummary(rentDueId, organizationId) {
        const result = await pool.query(
            `SELECT
                rent_dues.id AS rent_due_id,
                rent_dues.amount_paise AS amount_due_paise,
                COALESCE((SELECT SUM(p.amount_paise) FROM payments p WHERE p.rent_due_id = rent_dues.id), 0) -
                COALESCE((SELECT SUM(pr.amount_paise) FROM payment_reversals pr JOIN payments p ON p.id = pr.payment_id WHERE p.rent_due_id = rent_dues.id), 0)
                    AS amount_paid_paise,
                rent_dues.amount_paise -
                    (COALESCE((SELECT SUM(p.amount_paise) FROM payments p WHERE p.rent_due_id = rent_dues.id), 0) -
                     COALESCE((SELECT SUM(pr.amount_paise) FROM payment_reversals pr JOIN payments p ON p.id = pr.payment_id WHERE p.rent_due_id = rent_dues.id), 0)) AS amount_remaining_paise,
                CASE
                    WHEN COALESCE((SELECT SUM(p.amount_paise) FROM payments p WHERE p.rent_due_id = rent_dues.id), 0) - COALESCE((SELECT SUM(pr.amount_paise) FROM payment_reversals pr JOIN payments p ON p.id = pr.payment_id WHERE p.rent_due_id = rent_dues.id), 0) = 0
                        THEN 'DUE'
                    WHEN COALESCE((SELECT SUM(p.amount_paise) FROM payments p WHERE p.rent_due_id = rent_dues.id), 0) - COALESCE((SELECT SUM(pr.amount_paise) FROM payment_reversals pr JOIN payments p ON p.id = pr.payment_id WHERE p.rent_due_id = rent_dues.id), 0) < rent_dues.amount_paise
                        THEN 'PARTIALLY_PAID'
                    ELSE 'PAID'
                END AS status
             FROM rent_dues
             JOIN stays ON stays.id = rent_dues.stay_id
             WHERE rent_dues.id = $1 AND stays.organization_id = $2
             GROUP BY rent_dues.id, rent_dues.amount_paise`,
            [rentDueId, organizationId]
        );

        return result.rows[0];
    },

    /**
     * Create a single rent due record manually.
     * Verifies the stay belongs to the organization.
     */
    async create(stayId, organizationId, dueMonth, amountPaise, dueDate) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // Verify stay belongs to this organization
            const stayCheck = await client.query(
                `SELECT id FROM stays
                 WHERE id = $1 AND organization_id = $2`,
                [stayId, organizationId]
            );
            if (stayCheck.rows.length === 0) {
                throw new Error("STAY_NOT_FOUND");
            }

            const result = await client.query(
                `INSERT INTO rent_dues (stay_id, due_month, amount_paise, due_date)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, stay_id, to_char(due_month, 'YYYY-MM-DD') AS due_month,
                    amount_paise, to_char(due_date, 'YYYY-MM-DD') AS due_date, status, created_at, updated_at`,
                [stayId, dueMonth, amountPaise, dueDate]
            );

            await client.query("COMMIT");
            return result.rows[0];

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Auto-generate rent dues for all active stays in an organization
     * for a given month.
     *
     * Uses the bed's rent amount derived from the room's context.
     * Skips stays that already have a due for that month (UNIQUE constraint).
     *
     * @param {number} organizationId
     * @param {string} dueMonth - YYYY-MM-01 format (first of the month)
     * @param {number} amountPaise - Monthly rent per stay in paise
     * @param {string} dueDate - Due date for payment (YYYY-MM-DD)
     * @returns {{ created: Array, skipped: number }} result summary
     */
    async generateForMonth(organizationId, dueMonth, dueDate) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // 1. Get all active stays (no move_out_date) for this organization
            //    that were active on or before the due month
            const activeStays = await client.query(
                `SELECT s.id AS stay_id, rp.monthly_rent_paise
                 FROM stays s
                 LEFT JOIN LATERAL (
                    SELECT monthly_rent_paise FROM stay_rate_plans
                    WHERE stay_id = s.id AND effective_from <= $2
                      AND (effective_to IS NULL OR effective_to >= $2)
                    ORDER BY effective_from DESC LIMIT 1
                 ) rp ON TRUE
                 WHERE s.organization_id = $1
                   AND s.move_out_date IS NULL
                   AND s.move_in_date <= $2
                 ORDER BY s.id`,
                [organizationId, dueMonth]
            );

            const created = [];
            let skipped = 0;
            let missingRatePlan = 0;

            for (const stay of activeStays.rows) {
                if (!stay.monthly_rent_paise) {
                    missingRatePlan++;
                    continue;
                }
                try {
                    const result = await client.query(
                        `INSERT INTO rent_dues (stay_id, due_month, amount_paise, due_date)
                         VALUES ($1, $2, $3, $4)
                         RETURNING id, stay_id, to_char(due_month, 'YYYY-MM-DD') AS due_month,
                            amount_paise, to_char(due_date, 'YYYY-MM-DD') AS due_date, status, created_at, updated_at`,
                        [stay.stay_id, dueMonth, stay.monthly_rent_paise, dueDate]
                    );
                    created.push(result.rows[0]);
                } catch (err) {
                    // UNIQUE violation (stay_id, due_month) — already has a due for this month
                    if (err.code === "23505") {
                        skipped++;
                    } else {
                        throw err;
                    }
                }
            }

            await client.query("COMMIT");
            return { created, skipped, missing_rate_plan: missingRatePlan, total_active_stays: activeStays.rows.length };

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = RentDueModel;
