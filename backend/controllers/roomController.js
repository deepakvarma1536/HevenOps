const RoomModel = require("../models/roomModel");
const { validateIdParam } = require("../utils/validators");

const RoomController = {
    async getByFloor(req, res) {
        try {
            const { floorId } = req.params;

            if (!validateIdParam(floorId, res, "floorId")) return;

            const rooms = await RoomModel.getByFloor(floorId);
            res.json(rooms);
        } catch (error) {
            console.error("Database query failed:", error);
            res.status(500).json({ error: "Failed to fetch rooms" });
        }
    }
};

module.exports = RoomController;
