const express = require("express");
const { assignedProperty, propertyScope } = require("../middleware/propertyAccess");
const router = express.Router();
const SpendModel = require("../models/spendModel");
const { authorize } = require("../middleware/authorize");
const validateRequest = require("../middleware/validateRequest");
const { schemas } = require("../utils/requestSchemas");

router.get("/", authorize("finance:read"), validateRequest(schemas.spendList), propertyScope, async (req, res) => {
    const spends = await SpendModel.getAll(req.user.organizationId, req.listOptions);
    res.json(spends);
});

router.post("/", authorize("finance:write"), validateRequest(schemas.spendCreate), assignedProperty("property", (req) => req.validated.body.propertyId, { checkAll: true }), async (req, res) => {
    const { body, headers } = req.validated;
    const { spend, wasCreated } = await SpendModel.create(req.user.organizationId, body, headers["idempotency-key"]);
    res.status(wasCreated ? 201 : 200).json(spend);
});

module.exports = router;
