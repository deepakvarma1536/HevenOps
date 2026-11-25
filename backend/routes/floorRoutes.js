const express = require("express");
const { assignedProperty } = require("../middleware/propertyAccess");
const router = express.Router();
const FloorController = require("../controllers/floorController");
const { authorize } = require("../middleware/authorize");
const validateRequest = require("../middleware/validateRequest");
const { schemas } = require("../utils/requestSchemas");

// GET    /api/floors?propertyId=X
router.get("/", validateRequest(schemas.floorList), assignedProperty("property", (req) => req.validated.query.propertyId), FloorController.getByProperty);

// POST   /api/floors
router.post("/", authorize("operations:write"), validateRequest(schemas.floorCreate), assignedProperty("property", (req) => req.validated.body.propertyId), FloorController.create);

// PATCH  /api/floors/:id
router.patch("/:id", authorize("operations:write"), validateRequest(schemas.floorUpdate), assignedProperty("floor", (req) => req.validated.params.id), FloorController.update);

// DELETE /api/floors/:id
router.delete("/:id", authorize("*"), validateRequest(schemas.floorDelete), FloorController.delete);

module.exports = router;
