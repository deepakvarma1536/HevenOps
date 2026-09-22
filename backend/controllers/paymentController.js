const PaymentModel = require("../models/paymentModel");

const PaymentController = {

    async getByRentDue(req, res) {
        try {
            const { rentDueId } = req.params;

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

            const {
                amount_paise,
                payment_method,
                reference
            } = req.body;


            // 1. Validate amount
            if (!amount_paise || amount_paise <= 0) {
                return res.status(400).json({
                    error: "Amount must be greater than 0"
                });
            }


            // 2. Get remaining rent
            const rentDue = await PaymentModel.getRemainingAmount(rentDueId);

            if (!rentDue) {
                return res.status(404).json({
                    error: "Rent due not found"
                });
            }


            // 3. Convert PostgreSQL value to JavaScript number
            const remainingPaise = Number(rentDue.remaining_paise);


            // 4. Prevent overpayment
            if (amount_paise > remainingPaise) {
                return res.status(400).json({
                    error: "Payment amount exceeds remaining rent",
                    remaining_paise: remainingPaise
                });
            }


            // 5. Create payment
            const payment = await PaymentModel.create(
                rentDueId,
                amount_paise,
                payment_method,
                reference
            );


            // 6. Return created payment
            res.status(201).json(payment);

        } catch (error) {
            console.error("Failed to create payment:", error);

            res.status(500).json({
                error: "Failed to create payment"
            });
        }
    }

};

module.exports = PaymentController;