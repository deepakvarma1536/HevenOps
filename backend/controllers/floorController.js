const FloorModel = require("../models/floorModel");

const FloorController = {
    async getByProperty(req, res) {
        try {
            const { propertyId } = req.params;
            const floors = await FloorModel.getByProperty(propertyId);
            res.json(floors);
        } catch (error) {
            console.error("Database query failed:", error);
            res.status(500).json({ error: "Failed to fetch floors" });
        }
    }
};

module.exports = FloorController;
