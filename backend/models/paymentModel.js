const pool = require("../config/db");
const { paginateQuery } = require("../utils/pagination");
const { netPaidFor, rentDueStatus } = require("./rentDueBalance");

const netPaidQuery = `SELECT ${netPaidFor("$1")} AS net_paid`;

const updateRentDueStatus = async (client, rentDueId) => {
    await client.query(
        `WITH balance AS (${netPaidQuery})
         UPDATE rent_dues rd SET status = ${rentDueStatus}, updated_at = CURRENT_TIMESTAMP
         FROM balance WHERE rd.id = $1`,
        [rentDueId]
    );
};

const PaymentModel = {
    async getByRentDue(rentDueId, organizationId, options = {}) {
        const fromWhere = `FROM payments p JOIN rent_dues rd ON rd.id = p.rent_due_id
             JOIN stays s ON s.id = rd.stay_id
             WHERE p.rent_due_id = $1 AND s.organization_id = $2
             `;
        return paginateQuery(pool, {
            select: `SELECT p.id, p.rent_due_id, p.amount_paise, p.payment_date,
                p.payment_method, p.reference, p.created_at, rd.due_month,
                (SELECT COALESCE(SUM(pr.amount_paise), 0)
                 FROM payment_reversals pr WHERE pr.payment_id = p.id) AS reversed_amount_paise`,
            fromWhere,
            values: [rentDueId, organizationId],
            ...options,
            sortColumns: { id: "p.id", payment_date: "p.payment_date", amount_paise: "p.amount_paise", payment_method: "p.payment_method" },
            tieColumn: "p.id",
        });
    },

    async processPayment(rentDueId, organizationId, amountPaise, paymentMethod, reference, idempotencyKey) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const existing = await client.query(
                `SELECT p.* FROM payments p JOIN rent_dues rd ON rd.id = p.rent_due_id
                 JOIN stays s ON s.id = rd.stay_id WHERE p.idempotency_key = $1 AND s.organization_id = $2`,
                [idempotencyKey, organizationId]
            );
            if (existing.rows.length) { await client.query("COMMIT"); return { payment: existing.rows[0], wasCreated: false }; }
            const due = await client.query(
                `SELECT rd.id, rd.amount_paise FROM rent_dues rd JOIN stays s ON s.id = rd.stay_id
                 WHERE rd.id = $1 AND s.organization_id = $2 FOR UPDATE OF rd`, [rentDueId, organizationId]
            );
            if (!due.rows.length) throw new Error("NOT_FOUND");
            const totals = await client.query(netPaidQuery, [rentDueId]);
            const remaining = Number(due.rows[0].amount_paise) - Number(totals.rows[0].net_paid);
            if (amountPaise > remaining) throw new Error(`OVERPAYMENT:${remaining}`);
            const inserted = await client.query(
                `INSERT INTO payments (rent_due_id, amount_paise, payment_date, payment_method, reference, idempotency_key)
                 VALUES ($1, $2, CURRENT_DATE, $3, $4, $5) RETURNING *`,
                [rentDueId, amountPaise, paymentMethod || null, reference || null, idempotencyKey]
            );
            await updateRentDueStatus(client, rentDueId);
            await client.query("COMMIT");
            return { payment: inserted.rows[0], wasCreated: true };
        } catch (error) {
            await client.query("ROLLBACK");
            if (error.code === "23505") {
                const duplicate = await pool.query("SELECT * FROM payments WHERE idempotency_key = $1", [idempotencyKey]);
                if (duplicate.rows.length) return { payment: duplicate.rows[0], wasCreated: false };
            }
            throw error;
        } finally { client.release(); }
    },

    async reversePayment(paymentId, organizationId, amountPaise, reason, idempotencyKey) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const existing = await client.query("SELECT * FROM payment_reversals WHERE idempotency_key = $1", [idempotencyKey]);
            if (existing.rows.length) { await client.query("COMMIT"); return { reversal: existing.rows[0], wasCreated: false }; }
            const payment = await client.query(
                `SELECT p.id, p.rent_due_id, p.amount_paise
                 FROM payments p JOIN rent_dues rd ON rd.id = p.rent_due_id JOIN stays s ON s.id = rd.stay_id
                 WHERE p.id = $1 AND s.organization_id = $2 FOR UPDATE OF p, rd`, [paymentId, organizationId]
            );
            if (!payment.rows.length) throw new Error("NOT_FOUND");
            const reversed = await client.query("SELECT COALESCE(SUM(amount_paise), 0) AS total FROM payment_reversals WHERE payment_id = $1", [paymentId]);
            const remaining = Number(payment.rows[0].amount_paise) - Number(reversed.rows[0].total);
            if (amountPaise > remaining) throw new Error(`OVERREVERSAL:${remaining}`);
            const inserted = await client.query(
                `INSERT INTO payment_reversals (payment_id, amount_paise, reason, idempotency_key)
                 VALUES ($1, $2, $3, $4) RETURNING *`, [paymentId, amountPaise, reason, idempotencyKey]
            );
            await updateRentDueStatus(client, payment.rows[0].rent_due_id);
            await client.query("COMMIT");
            return { reversal: inserted.rows[0], wasCreated: true };
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally { client.release(); }
    }
};

module.exports = PaymentModel;
