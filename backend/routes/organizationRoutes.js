const express = require("express");
const router = express.Router();
const OrganizationController = require("../controllers/organizationController");

// GET    /api/organizations
router.get("/", OrganizationController.getAll);

// PATCH  /api/organizations/:id
router.patch("/:id", OrganizationController.update);

// DELETE /api/organizations/:id
router.delete("/:id", OrganizationController.delete);

module.exports = router;
