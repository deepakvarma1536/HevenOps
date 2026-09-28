const StayModel = require("../models/stayModel");
const { validateIdParam } = require("../utils/validators");

const StayController = {
    async getAll(req, res) {
        try {
            const { organizationId } = req.query;

            if (!organizationId) {
                return res.status(400).json({
                    error: "organizationId query parameter is required"
                });
            }

            if (!validateIdParam(organizationId, res, "organizationId")) return;

            const stays = await StayModel.getAllWithDetails(organizationId);
            res.json(stays);
        } catch (error) {
            console.error("Database query failed:", error);
            res.status(500).json({ error: "Failed to fetch stays" });
        }
    }
};

module.exports = StayController;
