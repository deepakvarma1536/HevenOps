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

    async processPayment(rentDueId, amountPaise, paymentMethod, reference) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // 1. Lock the rent_due record to prevent race conditions
            const rentDueResult = await client.query(
                `SELECT amount_paise, status 
                 FROM rent_dues 
                 WHERE id = $1 FOR UPDATE`,
                [rentDueId]
            );

            if (rentDueResult.rows.length === 0) {
                throw new Error("NOT_FOUND");
            }

            const rentDue = rentDueResult.rows[0];

            // 2. Calculate sum of existing payments
            const paymentsResult = await client.query(
                `SELECT COALESCE(SUM(amount_paise), 0) AS total_paid
                 FROM payments 
                 WHERE rent_due_id = $1`,
                [rentDueId]
            );
            
            const totalPaid = Number(paymentsResult.rows[0].total_paid);
            const remainingPaise = Number(rentDue.amount_paise) - totalPaid;

            // 3. Prevent overpayment
            if (amountPaise > remainingPaise) {
                throw new Error(`OVERPAYMENT:${remainingPaise}`);
            }

            // 4. Insert the payment
            const paymentResult = await client.query(
                `INSERT INTO payments
                    (rent_due_id, amount_paise, payment_date, payment_method, reference)
                 VALUES
                    ($1, $2, CURRENT_DATE, $3, $4)
                 RETURNING *`,
                [rentDueId, amountPaise, paymentMethod, reference]
            );

            const newPayment = paymentResult.rows[0];

            // 5. Update rent_due status based on new total
            const newTotalPaid = totalPaid + amountPaise;
            const newStatus = (newTotalPaid >= Number(rentDue.amount_paise)) ? 'PAID' : 'PARTIALLY_PAID';

            await client.query(
                `UPDATE rent_dues SET status = $1 WHERE id = $2`,
                [newStatus, rentDueId]
            );

            await client.query("COMMIT");
            return newPayment;

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = PaymentModel;