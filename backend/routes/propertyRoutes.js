const express = require("express");
const router = express.Router();
const PropertyController = require("../controllers/propertyController");

// GET /api/organizations/:organizationId/properties
router.get("/:organizationId/properties", PropertyController.getByOrganization);

module.exports = router;
