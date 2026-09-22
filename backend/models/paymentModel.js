const pool = require("../config/db");

const PaymentModel = {
    async getByRentDue(rentDueId) {
        const result = await pool.query(
            `SELECT *
             FROM payments
             WHERE rent_due_id = $1
             ORDER BY payment_date, id`,
            [rentDueId]
        );

        return result.rows;
    },

    async getRemainingAmount(rentDueId) {
        const result = await pool.query(
            `SELECT
                rent_dues.amount_paise -
                COALESCE(SUM(payments.amount_paise), 0) AS remaining_paise
             FROM rent_dues
             LEFT JOIN payments
                ON payments.rent_due_id = rent_dues.id
             WHERE rent_dues.id = $1
             GROUP BY rent_dues.id, rent_dues.amount_paise`,
            [rentDueId]
        );

        return result.rows[0];
    },

    async create(rentDueId, amountPaise, paymentMethod, reference) {
        const result = await pool.query(
            `INSERT INTO payments
                (rent_due_id, amount_paise, payment_date, payment_method, reference)
             VALUES
                ($1, $2, CURRENT_DATE, $3, $4)
             RETURNING *`,
            [rentDueId, amountPaise, paymentMethod, reference]
        );

        return result.rows[0];
    }
};

module.exports = PaymentModel;