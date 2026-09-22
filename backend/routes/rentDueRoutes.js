const express = require("express");
const router = express.Router();

const RentDueController = require("../controllers/rentDueController");

// GET /api/rent-dues/:rentDueId/summary
router.get("/:rentDueId/summary", RentDueController.getSummary);

module.exports = router;