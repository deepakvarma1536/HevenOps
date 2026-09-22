const express = require("express");
const router = express.Router();
const StayController = require("../controllers/stayController");
const RentDueController = require("../controllers/rentDueController");

// GET /api/stays
router.get("/", StayController.getAll);

// GET /api/stays/:stayId/rent-dues
router.get("/:stayId/rent-dues", RentDueController.getByStay);

module.exports = router;
