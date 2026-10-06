const StayModel = require("../models/stayModel");

const StayController = {
    async getAll(req, res) {
        try {
            const stays = await StayModel.getAllWithDetails(req.user.organizationId);
            res.json(stays);
        } catch (error) {
            console.error("Database query failed:", error);
            res.status(500).json({ error: "Failed to fetch stays" });
        }
    }
};

module.exports = StayController;
