const express = require("express");
const { assignedProperty, propertyScope } = require("../middleware/propertyAccess");
const router = express.Router();
const TenantController = require("../controllers/tenantController");
const tenantAuthController = require("../controllers/tenantAuthController");
const { authorize } = require("../middleware/authorize");
const validateRequest = require("../middleware/validateRequest");
const { schemas } = require("../utils/requestSchemas");

// GET    /api/tenants
router.get("/", validateRequest(schemas.tenantList), propertyScope, TenantController.getAll);

// GET    /api/tenants/:id
router.get("/:id", assignedProperty("tenant", (req) => req.params.id), TenantController.getById);

// POST   /api/tenants
router.post("/", authorize("operations:write"), validateRequest(schemas.tenantCreate), assignedProperty("property", (req) => req.validated.body.propertyId, { checkAll: true }), TenantController.create);

// PATCH  /api/tenants/:id
router.patch("/:id", authorize("operations:write"), validateRequest(schemas.tenantUpdate), assignedProperty("tenant", (req) => req.validated.params.id), TenantController.update);

// POST /api/tenants/:id/auth-token  { purpose: 'INVITE' | 'PASSWORD_RESET' }
router.post("/:id/invite", authorize("tenant:auth"), validateRequest(schemas.tenantInvite), tenantAuthController.issueInvite);
router.post("/:id/auth-token", authorize("tenant:auth"), validateRequest(schemas.tenantAuthToken), tenantAuthController.issueInvite);

// DELETE /api/tenants/:id
router.delete("/:id", authorize("*"), validateRequest(schemas.tenantDelete), TenantController.delete);

module.exports = router;
