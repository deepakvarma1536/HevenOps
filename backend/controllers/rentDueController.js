const RentDueModel = require("../models/rentDueModel");
const { validateIdParam } = require("../utils/validators");

const RentDueController = {
    async getByStay(req, res) {
        try {
            const { stayId } = req.params;

            if (!validateIdParam(stayId, res, "stayId")) return;

            const rentDues = await RentDueModel.getByStay(stayId);

            res.json(rentDues);
        } catch (error) {
            console.error("Failed to fetch rent dues:", error);

            res.status(500).json({
                error: "Failed to fetch rent dues"
            });
        }
    },

    async getSummary(req, res) {
        try {
            const { rentDueId } = req.params;

            if (!validateIdParam(rentDueId, res, "rentDueId")) return;

            const summary = await RentDueModel.getSummary(rentDueId);

            if (!summary) {
                return res.status(404).json({
                    error: "Rent due not found"
                });
            }

            res.json(summary);
        } catch (error) {
            console.error("Failed to fetch rent summary:", error);

            res.status(500).json({
                error: "Failed to fetch rent summary"
            });
        }
    }
};

module.exports = RentDueController;