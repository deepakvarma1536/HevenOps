const express = require("express");
const router = express.Router();

const RentDueController = require("../controllers/rentDueController");
const { authorize } = require("../middleware/authorize");
const validateRequest = require("../middleware/validateRequest");
const { schemas } = require("../utils/requestSchemas");

// POST /api/rent-dues — Create a single rent due manually
router.post("/", authorize("finance:write"), validateRequest(schemas.rentDueCreate), RentDueController.create);

// POST /api/rent-dues/generate — Auto-generate dues for all active stays
router.post("/generate", authorize("finance:write"), validateRequest(schemas.rentDueGenerate), RentDueController.generate);

// GET /api/rent-dues/:rentDueId/summary — Get rent due summary with payments
router.get("/:rentDueId/summary", authorize("finance:read"), RentDueController.getSummary);

module.exports = router;
