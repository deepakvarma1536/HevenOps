const express = require("express");
const router = express.Router();
const RoomController = require("../controllers/roomController");
const { authorize } = require("../middleware/authorize");
const validateRequest = require("../middleware/validateRequest");
const { schemas } = require("../utils/requestSchemas");

// GET    /api/rooms?floorId=X
router.get("/", validateRequest(schemas.roomList), RoomController.getByFloor);

// POST   /api/rooms
router.post("/", authorize("operations:write"), validateRequest(schemas.roomCreate), RoomController.create);

// PATCH  /api/rooms/:id
router.patch("/:id", authorize("operations:write"), validateRequest(schemas.roomUpdate), RoomController.update);

// DELETE /api/rooms/:id
router.delete("/:id", authorize("*"), validateRequest(schemas.roomDelete), RoomController.delete);

module.exports = router;
