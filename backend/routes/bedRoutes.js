const express = require("express");
const router = express.Router();
const BedController = require("../controllers/bedController");
const { authorize } = require("../middleware/authorize");
const validateRequest = require("../middleware/validateRequest");
const { schemas } = require("../utils/requestSchemas");

// GET    /api/beds?roomId=X
router.get("/", validateRequest(schemas.bedList), BedController.getByRoom);

// POST   /api/beds
router.post("/", authorize("operations:write"), validateRequest(schemas.bedCreate), BedController.create);

// PATCH  /api/beds/:id/status
router.patch("/:id/status", authorize("operations:write"), validateRequest(schemas.bedStatus), BedController.updateStatus);

// DELETE /api/beds/:id
router.delete("/:id", authorize("*"), validateRequest(schemas.bedDelete), BedController.delete);

module.exports = router;
