const PaymentModel = require("../models/paymentModel");
const { validateIdParam, validateIdempotencyKey } = require("../utils/validators");

const PaymentController = {

    async getByRentDue(req, res) {
        try {
            const { rentDueId } = req.listOptions;

            if (!rentDueId) {
                return res.status(400).json({ error: "rentDueId query parameter is required" });
            }
            if (!validateIdParam(rentDueId, res, "rentDueId")) return;

            const payments = await PaymentModel.getByRentDue(rentDueId, req.user.organizationId, req.listOptions);
            res.json(payments);

        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "payment list failed");
            res.status(500).json({ error: "Failed to fetch payments" });
        }
    },

    async create(req, res) {
        try {
            const { rentDueId, amount_paise, payment_method, reference } = req.body;
            const idempotencyKey = req.get("Idempotency-Key");

            if (!rentDueId) {
                return res.status(400).json({ error: "rentDueId is required" });
            }
            if (!validateIdParam(String(rentDueId), res, "rentDueId")) return;

            // Validate amount
            if (!amount_paise || !Number.isInteger(amount_paise) || amount_paise <= 0) {
                return res.status(400).json({ error: "amount_paise must be a positive integer" });
            }
            if (!validateIdempotencyKey(idempotencyKey)) {
                return res.status(400).json({ error: "Idempotency-Key header must be 16-128 URL-safe characters" });
            }

            // Process payment transaction safely
            try {
                const result = await PaymentModel.processPayment(
                    rentDueId, req.user.organizationId, amount_paise, payment_method, reference, idempotencyKey
                );
                res.status(result.wasCreated ? 201 : 200).json(result.payment);

            } catch (error) {
                if (error.message === "NOT_FOUND") {
                    return res.status(404).json({ error: "Rent due not found" });
                }
                if (error.message.startsWith("OVERPAYMENT:")) {
                    const remaining = parseInt(error.message.split(":")[1], 10);
                    return res.status(400).json({
                        error: "Payment amount exceeds remaining rent",
                        remaining_paise: remaining
                    });
                }
                throw error;
            }

        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "payment create failed");
            res.status(500).json({ error: "Failed to create payment" });
        }
    },

    async reverse(req, res) {
        try {
            const { id } = req.params;
            const { amount_paise, reason } = req.body;
            const idempotencyKey = req.get("Idempotency-Key");
            if (!validateIdParam(id, res, "id")) return;
            if (!Number.isInteger(amount_paise) || amount_paise <= 0 || !reason?.trim()) {
                return res.status(400).json({ error: "amount_paise and reason are required" });
            }
            if (!validateIdempotencyKey(idempotencyKey)) {
                return res.status(400).json({ error: "Idempotency-Key header must be 16-128 URL-safe characters" });
            }
            const result = await PaymentModel.reversePayment(id, req.user.organizationId, amount_paise, reason.trim(), idempotencyKey);
            res.status(result.wasCreated ? 201 : 200).json(result.reversal);
        } catch (error) {
            if (error.message === "NOT_FOUND") return res.status(404).json({ error: "Payment not found" });
            if (error.message.startsWith("OVERREVERSAL:")) {
                return res.status(400).json({ error: "Reversal exceeds unreversed payment amount", remaining_paise: Number(error.message.split(":")[1]) });
            }
            req.log.error({ errorName: error.name, errorCode: error.code }, "payment reversal failed");
            res.status(500).json({ error: "Failed to reverse payment" });
        }
    }
};

module.exports = PaymentController;
