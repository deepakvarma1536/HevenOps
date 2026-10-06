const express = require("express");
const router = express.Router();
const FloorController = require("../controllers/floorController");

// GET    /api/floors?propertyId=X
router.get("/", FloorController.getByProperty);

// POST   /api/floors
router.post("/", FloorController.create);

// PATCH  /api/floors/:id
router.patch("/:id", FloorController.update);

// DELETE /api/floors/:id
router.delete("/:id", FloorController.delete);

module.exports = router;
