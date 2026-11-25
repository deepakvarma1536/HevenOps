const express = require("express");
const { assignedProperty } = require("../middleware/propertyAccess");
const router = express.Router();
const DepositController = require("../controllers/depositController");
const { authorize } = require("../middleware/authorize");
const validateRequest = require("../middleware/validateRequest");
const { schemas } = require("../utils/requestSchemas");

// GET /api/deposits?stayId=X — Get all deposit transactions for a stay
router.get("/", authorize("finance:read"), validateRequest(schemas.depositList), assignedProperty("stay", (req) => req.validated.query.stayId), DepositController.getByStay);

// GET /api/deposits/balance?stayId=X — Get net deposit balance for a stay
router.get("/balance", authorize("finance:read"), assignedProperty("stay", (req) => req.query.stayId), DepositController.getBalance);

// POST /api/deposits — Record a deposit collection or refund
router.post("/", authorize("finance:write"), validateRequest(schemas.depositCreate), assignedProperty("stay", (req) => req.validated.body.stayId), DepositController.create);

module.exports = router;
