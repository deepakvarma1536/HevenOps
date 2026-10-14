const express = require("express");
const router = express.Router();
const OrganizationController = require("../controllers/organizationController");
const { authorize } = require("../middleware/authorize");
const validateRequest = require("../middleware/validateRequest");
const { schemas } = require("../utils/requestSchemas");

// GET    /api/organizations
router.get("/", validateRequest(schemas.organizationList), OrganizationController.getAll);

// PATCH  /api/organizations/:id
router.patch("/:id", authorize("*"), validateRequest(schemas.organizationUpdate), OrganizationController.update);

// DELETE /api/organizations/:id
router.delete("/:id", authorize("*"), validateRequest(schemas.organizationDelete), OrganizationController.delete);

module.exports = router;
