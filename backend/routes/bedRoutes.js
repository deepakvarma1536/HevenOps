const express = require("express");
const router = express.Router();
const BedController = require("../controllers/bedController");

// GET /api/rooms/:roomId/beds
router.get("/:roomId/beds", BedController.getBedsByRoom);

module.exports = router;
