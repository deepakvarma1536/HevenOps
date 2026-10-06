const express = require("express");
const router = express.Router();
const TenantController = require("../controllers/tenantController");

// GET    /api/tenants
router.get("/", TenantController.getAll);

// GET    /api/tenants/:id
router.get("/:id", TenantController.getById);

// POST   /api/tenants
router.post("/", TenantController.create);

// PATCH  /api/tenants/:id
router.patch("/:id", TenantController.update);

module.exports = router;
