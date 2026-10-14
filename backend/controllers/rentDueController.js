const RentDueModel = require("../models/rentDueModel");
const { validateIdParam, isValidIsoDate } = require("../utils/validators");

const RentDueController = {
    /**
     * GET /api/stays/:stayId/rent-dues
     * Get all rent dues for a specific stay.
     */
    async getByStay(req, res) {
        try {
            const { stayId } = req.validated.params;

            const rentDues = await RentDueModel.getByStay(stayId, req.user.organizationId, req.listOptions);

            res.json(rentDues);
        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "rent due list failed");

            res.status(500).json({
                error: "Failed to fetch rent dues"
            });
        }
    },

    /**
     * GET /api/rent-dues/:rentDueId/summary
     * Get a rent due summary with payment breakdown.
     */
    async getSummary(req, res) {
        try {
            const { rentDueId } = req.params;

            if (!validateIdParam(rentDueId, res, "rentDueId")) return;

            const summary = await RentDueModel.getSummary(rentDueId, req.user.organizationId);

            if (!summary) {
                return res.status(404).json({
                    error: "Rent due not found"
                });
            }

            res.json(summary);
        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "rent summary fetch failed");

            res.status(500).json({
                error: "Failed to fetch rent summary"
            });
        }
    },

    /**
     * POST /api/rent-dues
     * Create a single rent due manually.
     * Body: { stayId, dueMonth, amount_paise, dueDate }
     */
    async create(req, res) {
        try {
            const { stayId, dueMonth, amount_paise, dueDate } = req.body;

            // Validate required fields
            if (!stayId || !dueMonth || !amount_paise || !dueDate) {
                return res.status(400).json({
                    error: "stayId, dueMonth, amount_paise, and dueDate are required"
                });
            }

            if (!validateIdParam(String(stayId), res, "stayId")) return;

            // Validate amount
            if (!Number.isInteger(amount_paise) || amount_paise <= 0) {
                return res.status(400).json({
                    error: "amount_paise must be a positive integer"
                });
            }

            // Validate dueMonth (YYYY-MM-DD, typically first of month)
            if (!isValidIsoDate(dueMonth) || !dueMonth.endsWith("-01")) {
                return res.status(400).json({
                    error: "dueMonth must be a valid date in YYYY-MM-DD format (e.g. 2026-10-01)"
                });
            }

            // Validate dueDate
            if (!isValidIsoDate(dueDate)) {
                return res.status(400).json({
                    error: "dueDate must be a valid date in YYYY-MM-DD format"
                });
            }

            const rentDue = await RentDueModel.create(
                stayId,
                req.user.organizationId,
                dueMonth,
                amount_paise,
                dueDate
            );

            res.status(201).json(rentDue);

        } catch (error) {
            if (error.message === "STAY_NOT_FOUND") {
                return res.status(404).json({ error: "Stay not found in your organization" });
            }
            // UNIQUE constraint violation — duplicate due for this stay+month
            if (error.code === "23505") {
                return res.status(409).json({
                    error: "A rent due already exists for this stay and month"
                });
            }
            req.log.error({ errorName: error.name, errorCode: error.code }, "rent due create failed");
            res.status(500).json({ error: "Failed to create rent due" });
        }
    },

    /**
     * POST /api/rent-dues/generate
     * Auto-generate rent dues for all active stays in the organization.
     * Body: { dueMonth, amount_paise, dueDate }
     *
     * This is a bulk operation — it creates rent dues for every active stay
     * that doesn't already have one for the specified month.
     */
    async generate(req, res) {
        try {
            const { dueMonth, dueDate } = req.body;

            // Validate required fields
            if (!dueMonth || !dueDate) {
                return res.status(400).json({
                    error: "dueMonth and dueDate are required"
                });
            }

            // Validate dueMonth
            if (!isValidIsoDate(dueMonth) || !dueMonth.endsWith("-01")) {
                return res.status(400).json({
                    error: "dueMonth must be a valid date in YYYY-MM-DD format (e.g. 2026-10-01)"
                });
            }

            // Validate dueDate
            if (!isValidIsoDate(dueDate)) {
                return res.status(400).json({
                    error: "dueDate must be a valid date in YYYY-MM-DD format"
                });
            }

            const result = await RentDueModel.generateForMonth(
                req.user.organizationId,
                dueMonth,
                dueDate
            );

            res.status(201).json({
                message: `Generated ${result.created.length} rent dues, skipped ${result.skipped} (already existed)`,
                total_active_stays: result.total_active_stays,
                created_count: result.created.length,
                skipped_count: result.skipped,
                missing_rate_plan_count: result.missing_rate_plan,
                created: result.created
            });

        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "rent due generation failed");
            res.status(500).json({ error: "Failed to generate rent dues" });
        }
    }
};

module.exports = RentDueController;
