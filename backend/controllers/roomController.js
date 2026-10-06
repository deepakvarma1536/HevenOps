const RoomModel = require("../models/roomModel");
const { validateIdParam } = require("../utils/validators");

const RoomController = {
    async getByFloor(req, res) {
        try {
            const { floorId } = req.query;

            if (!floorId) {
                return res.status(400).json({ error: "floorId query parameter is required" });
            }
            if (!validateIdParam(floorId, res, "floorId")) return;

            const rooms = await RoomModel.getByFloor(floorId, req.user.organizationId);
            res.json(rooms);
        } catch (error) {
            console.error("Failed to fetch rooms:", error);
            res.status(500).json({ error: "Failed to fetch rooms" });
        }
    },

    async create(req, res) {
        try {
            const { floorId, room_number, room_type } = req.body;

            if (!floorId || !room_number) {
                return res.status(400).json({ error: "floorId and room_number are required" });
            }

            const room = await RoomModel.create(
                floorId, room_number, room_type || null, req.user.organizationId
            );

            if (!room) {
                return res.status(404).json({ error: "Floor not found or access denied" });
            }

            res.status(201).json(room);
        } catch (error) {
            // Handle unique constraint violation (duplicate room number)
            if (error.code === "23505") {
                return res.status(409).json({ error: "Room number already exists on this floor" });
            }
            console.error("Failed to create room:", error);
            res.status(500).json({ error: "Failed to create room" });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            if (!validateIdParam(id, res, "id")) return;

            const { room_number, room_type } = req.body;
            if (!room_number) {
                return res.status(400).json({ error: "room_number is required" });
            }

            const updated = await RoomModel.update(
                id, room_number, room_type || null, req.user.organizationId
            );

            if (!updated) {
                return res.status(404).json({ error: "Room not found" });
            }

            res.json(updated);
        } catch (error) {
            if (error.code === "23505") {
                return res.status(409).json({ error: "Room number already exists on this floor" });
            }
            console.error("Failed to update room:", error);
            res.status(500).json({ error: "Failed to update room" });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            if (!validateIdParam(id, res, "id")) return;

            const deleted = await RoomModel.delete(id, req.user.organizationId);
            if (!deleted) {
                return res.status(404).json({ error: "Room not found" });
            }

            res.json({ message: "Room deleted" });
        } catch (error) {
            console.error("Failed to delete room:", error);
            res.status(500).json({ error: "Failed to delete room" });
        }
    }
};

module.exports = RoomController;
