const express = require("express");
const router = express.Router();
const PropertyController = require("../controllers/propertyController");

// GET    /api/properties
router.get("/", PropertyController.getAll);

// POST   /api/properties
router.post("/", PropertyController.create);

// PATCH  /api/properties/:id
router.patch("/:id", PropertyController.update);

// DELETE /api/properties/:id
router.delete("/:id", PropertyController.delete);

module.exports = router;
