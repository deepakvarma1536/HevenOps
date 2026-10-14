const pool = require("../config/db");
const { paginateQuery } = require("../utils/pagination");

const DepositModel = {
    /**
     * Get all deposit transactions for a specific stay.
     * Verifies stay belongs to the caller's organization.
     */
    async getByStay(stayId, organizationId, options = {}) {
        const fromWhere = `FROM deposit_transactions dt
             JOIN stays s ON dt.stay_id = s.id
             WHERE dt.stay_id = $1 AND s.organization_id = $2`;
        return paginateQuery(pool, {
            select: `SELECT dt.id, dt.stay_id, dt.transaction_type, dt.amount_paise,
                dt.transaction_date, dt.note, dt.created_at`,
            fromWhere,
            values: [stayId, organizationId],
            ...options,
            sortColumns: { id: "dt.id", transaction_date: "dt.transaction_date", amount_paise: "dt.amount_paise", transaction_type: "dt.transaction_type" },
            tieColumn: "dt.id",
        });
    },

    /**
     * Create a deposit transaction (COLLECT or REFUND).
     * Uses a transaction to verify the stay belongs to the organization
     * and to prevent refunding more than the net collected amount.
     */
    async create(stayId, organizationId, transactionType, amountPaise, transactionDate, note, idempotencyKey) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            const existing = await client.query(
                `SELECT dt.* FROM deposit_transactions dt
                 JOIN stays s ON s.id = dt.stay_id
                 WHERE dt.idempotency_key = $1 AND s.organization_id = $2`,
                [idempotencyKey, organizationId]
            );
            if (existing.rows.length > 0) {
                await client.query("COMMIT");
                return { deposit: existing.rows[0], wasCreated: false };
            }

            // 1. Verify stay belongs to this organization and lock
            const stayCheck = await client.query(
                `SELECT id FROM stays
                 WHERE id = $1 AND organization_id = $2
                 FOR UPDATE`,
                [stayId, organizationId]
            );
            if (stayCheck.rows.length === 0) {
                throw new Error("STAY_NOT_FOUND");
            }

            // 2. If REFUND, verify sufficient deposit balance
            if (transactionType === "REFUND") {
                const balanceResult = await client.query(
                    `SELECT
                        COALESCE(SUM(CASE WHEN transaction_type = 'COLLECT' THEN amount_paise ELSE 0 END), 0) -
                        COALESCE(SUM(CASE WHEN transaction_type = 'REFUND' THEN amount_paise ELSE 0 END), 0)
                        AS net_balance
                     FROM deposit_transactions
                     WHERE stay_id = $1`,
                    [stayId]
                );
                const netBalance = Number(balanceResult.rows[0].net_balance);
                if (amountPaise > netBalance) {
                    throw new Error(`INSUFFICIENT_BALANCE:${netBalance}`);
                }
            }

            // 3. Insert the deposit transaction
            const result = await client.query(
                `INSERT INTO deposit_transactions
                    (stay_id, transaction_type, amount_paise, transaction_date, note, idempotency_key)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [stayId, transactionType, amountPaise, transactionDate, note, idempotencyKey]
            );

            await client.query("COMMIT");
            return { deposit: result.rows[0], wasCreated: true };

        } catch (error) {
            await client.query("ROLLBACK");
            if (error.code === "23505") {
                const duplicate = await pool.query("SELECT * FROM deposit_transactions WHERE idempotency_key = $1", [idempotencyKey]);
                if (duplicate.rows.length) return { deposit: duplicate.rows[0], wasCreated: false };
            }
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Get the net deposit balance for a stay.
     * Returns total collected, total refunded, and net balance.
     */
    async getBalanceByStay(stayId, organizationId) {
        const result = await pool.query(
            `SELECT
                COALESCE(SUM(CASE WHEN dt.transaction_type = 'COLLECT' THEN dt.amount_paise ELSE 0 END), 0)
                    AS total_collected_paise,
                COALESCE(SUM(CASE WHEN dt.transaction_type = 'REFUND' THEN dt.amount_paise ELSE 0 END), 0)
                    AS total_refunded_paise,
                COALESCE(SUM(CASE WHEN dt.transaction_type = 'COLLECT' THEN dt.amount_paise ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN dt.transaction_type = 'REFUND' THEN dt.amount_paise ELSE 0 END), 0)
                    AS net_balance_paise
             FROM deposit_transactions dt
             JOIN stays s ON dt.stay_id = s.id
             WHERE dt.stay_id = $1 AND s.organization_id = $2`,
            [stayId, organizationId]
        );
        return result.rows[0];
    }
};

module.exports = DepositModel;
