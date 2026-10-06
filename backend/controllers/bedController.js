const BedModel = require("../models/bedModel");
const { validateIdParam } = require("../utils/validators");

const BedController = {
    async getByRoom(req, res) {
        try {
            const { roomId } = req.query;

            if (!roomId) {
                return res.status(400).json({ error: "roomId query parameter is required" });
            }
            if (!validateIdParam(roomId, res, "roomId")) return;

            const beds = await BedModel.getByRoom(roomId, req.user.organizationId);
            res.json(beds);
        } catch (error) {
            console.error("Failed to fetch beds:", error);
            res.status(500).json({ error: "Failed to fetch beds" });
        }
    },

    async create(req, res) {
        try {
            const { roomId, bed_number } = req.body;

            if (!roomId || !bed_number) {
                return res.status(400).json({ error: "roomId and bed_number are required" });
            }

            const bed = await BedModel.create(
                roomId, bed_number, req.user.organizationId
            );

            if (!bed) {
                return res.status(404).json({ error: "Room not found or access denied" });
            }

            res.status(201).json(bed);
        } catch (error) {
            if (error.code === "23505") {
                return res.status(409).json({ error: "Bed number already exists in this room" });
            }
            console.error("Failed to create bed:", error);
            res.status(500).json({ error: "Failed to create bed" });
        }
    },

    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            if (!validateIdParam(id, res, "id")) return;

            const { status } = req.body;
            const validStatuses = ["VACANT", "OCCUPIED", "MAINTENANCE"];

            if (!status || !validStatuses.includes(status)) {
                return res.status(400).json({
                    error: `status must be one of: ${validStatuses.join(", ")}`
                });
            }

            const updated = await BedModel.updateStatus(
                id, status, req.user.organizationId
            );

            if (!updated) {
                return res.status(404).json({ error: "Bed not found" });
            }

            res.json(updated);
        } catch (error) {
            console.error("Failed to update bed status:", error);
            res.status(500).json({ error: "Failed to update bed status" });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            if (!validateIdParam(id, res, "id")) return;

            const deleted = await BedModel.delete(id, req.user.organizationId);
            if (!deleted) {
                return res.status(404).json({ error: "Bed not found" });
            }

            res.json({ message: "Bed deleted" });
        } catch (error) {
            console.error("Failed to delete bed:", error);
            res.status(500).json({ error: "Failed to delete bed" });
        }
    }
};

module.exports = BedController;
