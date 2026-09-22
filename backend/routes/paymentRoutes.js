const express = require("express");
const router = express.Router();

const PaymentController = require("../controllers/paymentController");

// GET /api/rent-dues/:rentDueId/payments
router.get("/:rentDueId/payments", PaymentController.getByRentDue);

// POST /api/rent-dues/:rentDueId/payments
router.post("/:rentDueId/payments", PaymentController.create);

module.exports = router;