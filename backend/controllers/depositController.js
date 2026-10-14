const DepositModel = require("../models/depositModel");
const { validateIdParam, isValidIsoDate, validateIdempotencyKey } = require("../utils/validators");

const VALID_TRANSACTION_TYPES = ["COLLECT", "REFUND"];

const DepositController = {
    /**
     * GET /api/deposits?stayId=X
     * Get all deposit transactions for a specific stay.
     */
    async getByStay(req, res) {
        try {
            const { stayId } = req.listOptions;

            if (!stayId) {
                return res.status(400).json({ error: "stayId query parameter is required" });
            }
            if (!validateIdParam(stayId, res, "stayId")) return;

            const deposits = await DepositModel.getByStay(stayId, req.user.organizationId, req.listOptions);
            res.json(deposits);

        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "deposit list failed");
            res.status(500).json({ error: "Failed to fetch deposit transactions" });
        }
    },

    /**
     * GET /api/deposits/balance?stayId=X
     * Get net deposit balance for a stay (collected - refunded).
     */
    async getBalance(req, res) {
        try {
            const { stayId } = req.query;

            if (!stayId) {
                return res.status(400).json({ error: "stayId query parameter is required" });
            }
            if (!validateIdParam(stayId, res, "stayId")) return;

            const balance = await DepositModel.getBalanceByStay(stayId, req.user.organizationId);
            res.json(balance);

        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "deposit balance fetch failed");
            res.status(500).json({ error: "Failed to fetch deposit balance" });
        }
    },

    /**
     * POST /api/deposits
     * Record a deposit collection or refund.
     * Body: { stayId, transactionType, amount_paise, transactionDate, note }
     *
     * Business rules:
     * - REFUND cannot exceed net collected amount
     * - Stay must belong to the user's organization
     */
    async create(req, res) {
        try {
            const { stayId, transactionType, amount_paise, transactionDate, note } = req.body;
            const idempotencyKey = req.get("Idempotency-Key");

            // Validate required fields
            if (!stayId || !transactionType || !amount_paise) {
                return res.status(400).json({
                    error: "stayId, transactionType, and amount_paise are required"
                });
            }

            if (!validateIdParam(String(stayId), res, "stayId")) return;

            // Validate transaction type
            if (!VALID_TRANSACTION_TYPES.includes(transactionType)) {
                return res.status(400).json({
                    error: `transactionType must be one of: ${VALID_TRANSACTION_TYPES.join(", ")}`
                });
            }

            // Validate amount
            if (!Number.isInteger(amount_paise) || amount_paise <= 0) {
                return res.status(400).json({
                    error: "amount_paise must be a positive integer"
                });
            }

            // Validate date if provided, default to today
            const txnDate = transactionDate || new Date().toISOString().split("T")[0];
            if (!isValidIsoDate(txnDate)) {
                return res.status(400).json({
                    error: "transactionDate must be a valid date in YYYY-MM-DD format"
                });
            }
            if (!validateIdempotencyKey(idempotencyKey)) {
                return res.status(400).json({ error: "Idempotency-Key header must be 16-128 URL-safe characters" });
            }

            const result = await DepositModel.create(
                stayId,
                req.user.organizationId,
                transactionType,
                amount_paise,
                txnDate,
                note ? note.trim() : null,
                idempotencyKey
            );

            res.status(result.wasCreated ? 201 : 200).json(result.deposit);

        } catch (error) {
            if (error.message === "STAY_NOT_FOUND") {
                return res.status(404).json({ error: "Stay not found in your organization" });
            }
            if (error.message.startsWith("INSUFFICIENT_BALANCE:")) {
                const balance = parseInt(error.message.split(":")[1], 10);
                return res.status(400).json({
                    error: "Refund amount exceeds available deposit balance",
                    available_balance_paise: balance
                });
            }
            req.log.error({ errorName: error.name, errorCode: error.code }, "deposit transaction create failed");
            res.status(500).json({ error: "Failed to create deposit transaction" });
        }
    }
};

module.exports = DepositController;
