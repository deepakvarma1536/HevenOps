const pool = require("../config/db");
const { paginateQuery } = require("../utils/pagination");
const { ApiError } = require("../utils/apiError");
const { rentDueBalanceJoin, rentDueStatus } = require("./rentDueBalance");
const { rentRateForMonth } = require("./scheduledRent");

const insertManualDue = `INSERT INTO rent_dues (stay_id, due_month, amount_paise, due_date, status)
    SELECT $1, $2, $3, $4, CASE WHEN $4::date < CURRENT_DATE THEN 'OVERDUE' ELSE 'DUE' END
    WHERE NOT EXISTS (SELECT 1 FROM rent_dues WHERE stay_id = $1 AND due_month = $2)
    ON CONFLICT (stay_id, due_month) WHERE billing_cycle IS NULL DO NOTHING
    RETURNING id, stay_id, to_char(due_month, 'YYYY-MM-DD') AS due_month,
        amount_paise, to_char(due_date, 'YYYY-MM-DD') AS due_date, status, created_at, updated_at`;

const RentDueModel = {
    /**
     * Get all rent dues for a specific stay, ordered by month.
     */
    async getByStay(stayId, organizationId, options = {}) {
        const values = [stayId, organizationId];
        let fromWhere = `FROM rent_dues rd
             JOIN stays s ON s.id = rd.stay_id
             ${rentDueBalanceJoin}
             WHERE rd.stay_id = $1 AND s.organization_id = $2
             `;
        if (options.status) {
            values.push(options.status);
            fromWhere += ` AND ${rentDueStatus} = $${values.length}`;
        }
        return paginateQuery(pool, {
            select: `SELECT rd.id, rd.stay_id, to_char(rd.due_month, 'YYYY-MM-DD') AS due_month,
                rd.amount_paise, to_char(rd.due_date, 'YYYY-MM-DD') AS due_date, rd.billing_cycle,
                balance.net_paid AS amount_paid_paise,
                rd.amount_paise - balance.net_paid AS amount_remaining_paise,
                ${rentDueStatus} AS status, rd.created_at, rd.updated_at`,
            fromWhere,
            values,
            ...options,
            sortColumns: { id: "rd.id", due_month: "rd.due_month", due_date: "rd.due_date", amount_paise: "rd.amount_paise", status: rentDueStatus },
            tieColumn: "rd.id",
        });
    },

    /**
     * Get a summary of a rent due with payment totals.
     */
    async getSummary(rentDueId, organizationId) {
        const result = await pool.query(
            `SELECT
                rd.id AS rent_due_id,
                rd.amount_paise AS amount_due_paise,
                balance.net_paid AS amount_paid_paise,
                rd.amount_paise - balance.net_paid AS amount_remaining_paise,
                ${rentDueStatus} AS status
             FROM rent_dues rd
             JOIN stays s ON s.id = rd.stay_id
             ${rentDueBalanceJoin}
             WHERE rd.id = $1 AND s.organization_id = $2`,
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
                 WHERE id = $1 AND organization_id = $2 FOR NO KEY UPDATE`,
                [stayId, organizationId]
            );
            if (stayCheck.rows.length === 0) {
                throw new Error("STAY_NOT_FOUND");
            }

            const result = await client.query(insertManualDue, [stayId, dueMonth, amountPaise, dueDate]);
            if (!result.rows.length) {
                throw new ApiError(409, "RENT_DUE_EXISTS", "A rent due already exists for this stay and month.");
            }

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
     * Generate manual rent dues for an organization for a given month.
     *
     * Uses the stay's rate plan effective at the start of the month.
     * Skips stays that already have a manual or automatic due for that month.
     *
     * @param {number} organizationId
     * @param {string} dueMonth - YYYY-MM-01 format (first of the month)
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
                 LEFT JOIN LATERAL (${rentRateForMonth("$2")}) rp ON TRUE
                 WHERE s.organization_id = $1
                   AND s.move_out_date IS NULL
                   AND s.move_in_date <= $2
                 ORDER BY s.id FOR NO KEY UPDATE OF s`,
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
                const result = await client.query(
                    insertManualDue,
                    [stay.stay_id, dueMonth, stay.monthly_rent_paise, dueDate]
                );
                if (result.rows.length) {
                    created.push(result.rows[0]);
                } else {
                    skipped++;
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
