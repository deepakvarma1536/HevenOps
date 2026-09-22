const express = require("express");
const router = express.Router();
const OrganizationController = require("../controllers/organizationController");

// GET /api/organizations
router.get("/", OrganizationController.getAll);

module.exports = router;
