const express = require("express");
const { assignedProperty } = require("../middleware/propertyAccess");
const router = express.Router();
const PaymentController = require("../controllers/paymentController");
const { authorize } = require("../middleware/authorize");
const validateRequest = require("../middleware/validateRequest");
const { schemas } = require("../utils/requestSchemas");

// GET  /api/payments?rentDueId=X
router.get("/", authorize("finance:read"), validateRequest(schemas.paymentList), assignedProperty("due", (req) => req.validated.query.rentDueId), PaymentController.getByRentDue);

// POST /api/payments
router.post("/", authorize("finance:write"), validateRequest(schemas.paymentCreate), assignedProperty("due", (req) => req.validated.body.rentDueId), PaymentController.create);

// POST /api/payments/:id/reversals
router.post("/:id/reversals", authorize("finance:write"), validateRequest(schemas.paymentReversal), assignedProperty("payment", (req) => req.validated.params.id), PaymentController.reverse);

module.exports = router;
