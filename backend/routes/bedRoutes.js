const express = require("express");
const { assignedProperty } = require("../middleware/propertyAccess");
const router = express.Router();
const BedController = require("../controllers/bedController");
const { authorize } = require("../middleware/authorize");
const validateRequest = require("../middleware/validateRequest");
const { schemas } = require("../utils/requestSchemas");

// GET    /api/beds?roomId=X
router.get("/", validateRequest(schemas.bedList), assignedProperty("room", (req) => req.validated.query.roomId), BedController.getByRoom);

// POST   /api/beds
router.post("/", authorize("operations:write"), validateRequest(schemas.bedCreate), assignedProperty("room", (req) => req.validated.body.roomId), BedController.create);

// PATCH  /api/beds/:id/status
router.patch("/:id/status", authorize("operations:write"), validateRequest(schemas.bedStatus), assignedProperty("bed", (req) => req.validated.params.id), BedController.updateStatus);

// DELETE /api/beds/:id
router.delete("/:id", authorize("*"), validateRequest(schemas.bedDelete), BedController.delete);

module.exports = router;
