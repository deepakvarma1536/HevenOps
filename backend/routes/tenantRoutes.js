const express = require("express");
const router = express.Router();
const TenantController = require("../controllers/tenantController");
const tenantAuthController = require("../controllers/tenantAuthController");
const { authorize } = require("../middleware/authorize");
const validateRequest = require("../middleware/validateRequest");
const { schemas } = require("../utils/requestSchemas");

// GET    /api/tenants
router.get("/", validateRequest(schemas.tenantList), TenantController.getAll);

// GET    /api/tenants/:id
router.get("/:id", TenantController.getById);

// POST   /api/tenants
router.post("/", authorize("operations:write"), validateRequest(schemas.tenantCreate), TenantController.create);

// PATCH  /api/tenants/:id
router.patch("/:id", authorize("operations:write"), validateRequest(schemas.tenantUpdate), TenantController.update);

// POST /api/tenants/:id/auth-token  { purpose: 'INVITE' | 'PASSWORD_RESET' }
router.post("/:id/invite", authorize("tenant:auth"), validateRequest(schemas.tenantInvite), tenantAuthController.issueInvite);
router.post("/:id/auth-token", authorize("tenant:auth"), validateRequest(schemas.tenantAuthToken), tenantAuthController.issueInvite);

// DELETE /api/tenants/:id
router.delete("/:id", authorize("*"), validateRequest(schemas.tenantDelete), TenantController.delete);

module.exports = router;
