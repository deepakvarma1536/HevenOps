const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/paymentController");

// GET  /api/payments?rentDueId=X
router.get("/", PaymentController.getByRentDue);

// POST /api/payments
router.post("/", PaymentController.create);

module.exports = router;