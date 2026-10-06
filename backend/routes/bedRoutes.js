const express = require("express");
const router = express.Router();
const BedController = require("../controllers/bedController");

// GET    /api/beds?roomId=X
router.get("/", BedController.getByRoom);

// POST   /api/beds
router.post("/", BedController.create);

// PATCH  /api/beds/:id/status
router.patch("/:id/status", BedController.updateStatus);

// DELETE /api/beds/:id
router.delete("/:id", BedController.delete);

module.exports = router;