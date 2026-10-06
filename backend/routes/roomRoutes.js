const express = require("express");
const router = express.Router();
const RoomController = require("../controllers/roomController");

// GET    /api/rooms?floorId=X
router.get("/", RoomController.getByFloor);

// POST   /api/rooms
router.post("/", RoomController.create);

// PATCH  /api/rooms/:id
router.patch("/:id", RoomController.update);

// DELETE /api/rooms/:id
router.delete("/:id", RoomController.delete);

module.exports = router;
