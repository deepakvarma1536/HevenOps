const PaymentModel = require("../models/paymentModel");
const { validateIdParam } = require("../utils/validators");

const PaymentController = {

    async getByRentDue(req, res) {
        try {
            const { rentDueId } = req.params;

            if (!validateIdParam(rentDueId, res, "rentDueId")) return;

            const payments = await PaymentModel.getByRentDue(rentDueId);

            res.json(payments);

        } catch (error) {
            console.error("Failed to fetch payments:", error);

            res.status(500).json({
                error: "Failed to fetch payments"
            });
        }
    },


    async create(req, res) {
        try {
            const { rentDueId } = req.params;

            if (!validateIdParam(rentDueId, res, "rentDueId")) return;

            const {
                amount_paise,
                payment_method,
                reference
            } = req.body;


            // 1. Validate amount
            if (!amount_paise || !Number.isInteger(amount_paise) || amount_paise <= 0) {
                return res.status(400).json({
                    error: "Amount must be a positive integer"
                });
            }


            // 2. Process payment transaction safely
            try {
                const payment = await PaymentModel.processPayment(
                    rentDueId,
                    amount_paise,
                    payment_method,
                    reference
                );
                
                res.status(201).json(payment);
                
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
                
                throw error; // Route to the outer 500 handler
            }

        } catch (error) {
            console.error("Failed to create payment:", error);

            res.status(500).json({
                error: "Failed to create payment"
            });
        }
    }

};

module.exports = PaymentController;