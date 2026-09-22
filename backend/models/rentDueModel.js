const pool = require("../config/db");

const RentDueModel = {
    async getByStay(stayId) {
        const result = await pool.query(
            `SELECT *
             FROM rent_dues
             WHERE stay_id = $1
             ORDER BY due_month`,
            [stayId]
        );

        return result.rows;
    },

    async getSummary(rentDueId) {
        const result = await pool.query(
            `SELECT
                rent_dues.id AS rent_due_id,
                rent_dues.amount_paise AS amount_due_paise,
                COALESCE(SUM(payments.amount_paise), 0) AS amount_paid_paise,
                rent_dues.amount_paise -
                    COALESCE(SUM(payments.amount_paise), 0) AS amount_remaining_paise,
                CASE
                    WHEN COALESCE(SUM(payments.amount_paise), 0) = 0
                        THEN 'DUE'
                    WHEN COALESCE(SUM(payments.amount_paise), 0) < rent_dues.amount_paise
                        THEN 'PARTIALLY_PAID'
                    ELSE 'PAID'
                END AS status
             FROM rent_dues
             LEFT JOIN payments
                ON payments.rent_due_id = rent_dues.id
             WHERE rent_dues.id = $1
             GROUP BY rent_dues.id, rent_dues.amount_paise`,
            [rentDueId]
        );

        return result.rows[0];
    }
};

module.exports = RentDueModel;