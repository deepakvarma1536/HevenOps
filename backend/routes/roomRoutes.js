const express = require("express");
const router = express.Router();
const RoomController = require("../controllers/roomController");

// GET /api/floors/:floorId/rooms
router.get("/:floorId/rooms", RoomController.getByFloor);

module.exports = router;
