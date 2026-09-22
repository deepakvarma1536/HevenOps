const express = require("express");
const router = express.Router();
const FloorController = require("../controllers/floorController");

// GET /api/properties/:propertyId/floors
router.get("/:propertyId/floors", FloorController.getByProperty);

module.exports = router;
