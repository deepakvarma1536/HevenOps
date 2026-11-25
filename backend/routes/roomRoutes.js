const express = require("express");
const { assignedProperty } = require("../middleware/propertyAccess");
const router = express.Router();
const RoomController = require("../controllers/roomController");
const { authorize } = require("../middleware/authorize");
const validateRequest = require("../middleware/validateRequest");
const { schemas } = require("../utils/requestSchemas");

// GET    /api/rooms?floorId=X
router.get("/", validateRequest(schemas.roomList), assignedProperty("floor", (req) => req.validated.query.floorId), RoomController.getByFloor);

// POST   /api/rooms
router.post("/", authorize("operations:write"), validateRequest(schemas.roomCreate), assignedProperty("floor", (req) => req.validated.body.floorId), RoomController.create);

// PATCH  /api/rooms/:id
router.patch("/:id", authorize("operations:write"), validateRequest(schemas.roomUpdate), assignedProperty("room", (req) => req.validated.params.id), RoomController.update);

// DELETE /api/rooms/:id
router.delete("/:id", authorize("*"), validateRequest(schemas.roomDelete), RoomController.delete);

module.exports = router;
