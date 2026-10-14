const StayModel = require("../models/stayModel");
const { validateIdParam, isValidIsoDate } = require("../utils/validators");

const StayController = {
    /**
     * GET /api/stays
     * List all stays for the authenticated user's organization.
     */
    async getAll(req, res) {
        try {
            const stays = await StayModel.getAllWithDetails(req.user.organizationId, req.listOptions);
            res.json(stays);
        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "stay list failed");
            res.status(500).json({ error: "Failed to fetch stays" });
        }
    },

    /**
     * GET /api/stays/:id
     * Get a single stay with full details.
     */
    async getById(req, res) {
        try {
            const { id } = req.params;
            if (!validateIdParam(id, res, "id")) return;

            const stay = await StayModel.getByIdWithDetails(id, req.user.organizationId);
            if (!stay) {
                return res.status(404).json({ error: "Stay not found" });
            }

            res.json(stay);
        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "stay fetch failed");
            res.status(500).json({ error: "Failed to fetch stay" });
        }
    },

    /**
     * POST /api/stays
     * Create a new stay: assign a tenant to a bed.
     * Body: { tenantId, bedId, moveInDate }
     *
     * Business rules enforced by the model:
     * - Tenant must belong to the same organization
     * - Bed must belong to the same organization and be VACANT
     * - Tenant must not already have an active stay
     * - Bed is atomically marked OCCUPIED in same transaction
     */
    async create(req, res) {
        try {
            const { tenantId, bedId, moveInDate, monthly_rent_paise } = req.body;

            // Validate required fields
            if (!tenantId || !bedId || !moveInDate || !monthly_rent_paise) {
                return res.status(400).json({
                    error: "tenantId, bedId, moveInDate, and monthly_rent_paise are required"
                });
            }

            if (!validateIdParam(String(tenantId), res, "tenantId")) return;
            if (!validateIdParam(String(bedId), res, "bedId")) return;

            // Validate date format (YYYY-MM-DD)
            if (!isValidIsoDate(moveInDate)) {
                return res.status(400).json({
                    error: "moveInDate must be a valid date in YYYY-MM-DD format"
                });
            }
            if (!Number.isInteger(monthly_rent_paise) || monthly_rent_paise <= 0) {
                return res.status(400).json({ error: "monthly_rent_paise must be a positive integer" });
            }

            const stay = await StayModel.create(
                req.user.organizationId,
                tenantId,
                bedId,
                moveInDate,
                monthly_rent_paise
            );

            // Return the full stay with joined details
            const stayWithDetails = await StayModel.getByIdWithDetails(
                stay.id,
                req.user.organizationId
            );

            res.status(201).json(stayWithDetails);

        } catch (error) {
            // Map domain errors to HTTP responses
            switch (error.message) {
                case "TENANT_NOT_FOUND":
                    return res.status(404).json({ error: "Tenant not found in your organization" });
                case "BED_NOT_FOUND":
                    return res.status(404).json({ error: "Bed not found in your organization" });
                case "BED_NOT_VACANT":
                    return res.status(409).json({ error: "Bed is not vacant — it is already occupied or under maintenance" });
                case "TENANT_HAS_ACTIVE_STAY":
                    return res.status(409).json({ error: "Tenant already has an active stay — checkout first before reassigning" });
                default:
                    req.log.error({ errorName: error.name, errorCode: error.code }, "stay create failed");
                    res.status(500).json({ error: "Failed to create stay" });
            }
        }
    },

    /**
     * PUT /api/stays/:id
     * Update a stay's move-in date (only while stay is active).
     * Body: { moveInDate }
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            if (!validateIdParam(id, res, "id")) return;

            const { moveInDate } = req.body;

            if (!moveInDate) {
                return res.status(400).json({ error: "moveInDate is required" });
            }

            if (!isValidIsoDate(moveInDate)) {
                return res.status(400).json({
                    error: "moveInDate must be a valid date in YYYY-MM-DD format"
                });
            }

            const updated = await StayModel.update(id, req.user.organizationId, moveInDate);
            if (!updated) {
                return res.status(404).json({
                    error: "Stay not found or already ended — only active stays can be updated"
                });
            }

            res.json(updated);
        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "stay update failed");
            res.status(500).json({ error: "Failed to update stay" });
        }
    },

    /**
     * PATCH /api/stays/:id/checkout
     * End a stay: set move_out_date and mark the bed as VACANT.
     * Body: { moveOutDate } — optional, defaults to today
     */
    async checkout(req, res) {
        try {
            const { id } = req.params;
            if (!validateIdParam(id, res, "id")) return;

            // Default to today if not provided
            const moveOutDate = req.body.moveOutDate || new Date().toISOString().split("T")[0];

            if (!isValidIsoDate(moveOutDate)) {
                return res.status(400).json({
                    error: "moveOutDate must be a valid date in YYYY-MM-DD format"
                });
            }

            const stay = await StayModel.checkout(id, req.user.organizationId, moveOutDate);

            res.json({
                message: "Stay ended successfully — bed is now vacant",
                stay
            });

        } catch (error) {
            if (error.message === "STAY_NOT_FOUND_OR_ALREADY_ENDED") {
                return res.status(404).json({
                    error: "Stay not found or has already been checked out"
                });
            }
            if (error.message === "MOVE_OUT_BEFORE_MOVE_IN") {
                return res.status(400).json({ error: "moveOutDate cannot be before moveInDate" });
            }
            req.log.error({ errorName: error.name, errorCode: error.code }, "stay checkout failed");
            res.status(500).json({ error: "Failed to process checkout" });
        }
    },

    async setRatePlan(req, res) {
        try {
            const { id } = req.params;
            const { effectiveFrom, monthly_rent_paise } = req.body;
            if (!validateIdParam(id, res, "id")) return;
            if (!isValidIsoDate(effectiveFrom) || !Number.isInteger(monthly_rent_paise) || monthly_rent_paise <= 0) {
                return res.status(400).json({ error: "effectiveFrom and positive integer monthly_rent_paise are required" });
            }
            const ratePlan = await StayModel.setRatePlan(id, req.user.organizationId, effectiveFrom, monthly_rent_paise);
            res.status(201).json(ratePlan);
        } catch (error) {
            if (error.message === "STAY_NOT_FOUND") return res.status(404).json({ error: "Stay not found" });
            if (error.code === "23505") return res.status(409).json({ error: "A rate plan already starts on this date" });
            req.log.error({ errorName: error.name, errorCode: error.code }, "stay rate plan failed");
            res.status(500).json({ error: "Failed to set stay rate plan" });
        }
    }
};

module.exports = StayController;
