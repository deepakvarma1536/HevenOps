const BedModel = require("../models/bedModel");
const { validateIdParam } = require("../utils/validators");

const BedController = {
    async getBedsByRoom(req, res) {
        try {
            const { roomId } = req.params;

            if (!validateIdParam(roomId, res, "roomId")) return;

            const beds = await BedModel.getByRoom(roomId);
            res.json(beds);
        } catch (error) {
            console.error("Database query failed:", error);
            res.status(500).json({ error: "Failed to fetch beds" });
        }
    }
};

module.exports = BedController;
