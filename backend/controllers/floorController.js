const FloorModel = require("../models/floorModel");
const { validateIdParam } = require("../utils/validators");

const FloorController = {
    async getByProperty(req, res) {
        try {
            const { propertyId } = req.params;

            if (!validateIdParam(propertyId, res, "propertyId")) return;

            const floors = await FloorModel.getByProperty(propertyId);
            res.json(floors);
        } catch (error) {
            console.error("Database query failed:", error);
            res.status(500).json({ error: "Failed to fetch floors" });
        }
    }
};

module.exports = FloorController;
