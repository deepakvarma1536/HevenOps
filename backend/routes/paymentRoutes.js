const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/paymentController");
const { authorize } = require("../middleware/authorize");
const validateRequest = require("../middleware/validateRequest");
const { schemas } = require("../utils/requestSchemas");

// GET  /api/payments?rentDueId=X
router.get("/", authorize("finance:read"), validateRequest(schemas.paymentList), PaymentController.getByRentDue);

// POST /api/payments
router.post("/", authorize("finance:write"), validateRequest(schemas.paymentCreate), PaymentController.create);

// POST /api/payments/:id/reversals
router.post("/:id/reversals", authorize("finance:write"), validateRequest(schemas.paymentReversal), PaymentController.reverse);

module.exports = router;
