const express = require("express");
const router = express.Router();
const PropertyController = require("../controllers/propertyController");
const { authorize } = require("../middleware/authorize");
const validateRequest = require("../middleware/validateRequest");
const { schemas } = require("../utils/requestSchemas");

// GET    /api/properties
router.get("/", validateRequest(schemas.propertyList), PropertyController.getAll);

// POST   /api/properties
router.post("/", authorize("operations:write"), validateRequest(schemas.propertyCreate), PropertyController.create);

// PATCH  /api/properties/:id
router.patch("/:id", authorize("operations:write"), validateRequest(schemas.propertyUpdate), PropertyController.update);

// DELETE /api/properties/:id
router.delete("/:id", authorize("*"), validateRequest(schemas.propertyDelete), PropertyController.delete);

module.exports = router;
