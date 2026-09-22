const express = require("express");
const router = express.Router();
const TenantController = require("../controllers/tenantController");

// GET /api/tenants
router.get("/", TenantController.getAll);

module.exports = router;
