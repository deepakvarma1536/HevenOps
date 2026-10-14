const express = require("express");
const router = express.Router();
const StayController = require("../controllers/stayController");
const RentDueController = require("../controllers/rentDueController");
const { authorize } = require("../middleware/authorize");
const validateRequest = require("../middleware/validateRequest");
const { schemas } = require("../utils/requestSchemas");

// GET /api/stays — List all stays
router.get("/", validateRequest(schemas.stayList), StayController.getAll);

// GET /api/stays/:id — Get a single stay with details
router.get("/:id", StayController.getById);

// POST /api/stays — Create a new stay (assign tenant to bed)
router.post("/", authorize("operations:write"), validateRequest(schemas.stayCreate), StayController.create);

// PUT /api/stays/:id — Update a stay (move-in date)
router.put("/:id", authorize("operations:write"), validateRequest(schemas.stayUpdate), StayController.update);

// PATCH /api/stays/:id/checkout — End a stay (checkout tenant, free bed)
router.patch("/:id/checkout", authorize("operations:write"), validateRequest(schemas.checkout), StayController.checkout);

// POST /api/stays/:id/rate-plans
router.post("/:id/rate-plans", authorize("finance:write"), validateRequest(schemas.ratePlan), StayController.setRatePlan);

// GET /api/stays/:stayId/rent-dues — Get rent dues for a stay
router.get("/:stayId/rent-dues", authorize("finance:read"), validateRequest(schemas.dueList), RentDueController.getByStay);

module.exports = router;
