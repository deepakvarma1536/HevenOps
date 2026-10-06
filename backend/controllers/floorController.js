const FloorModel = require("../models/floorModel");
const { validateIdParam } = require("../utils/validators");

const FloorController = {
    async getByProperty(req, res) {
        try {
            const { propertyId } = req.query;

            if (!propertyId) {
                return res.status(400).json({ error: "propertyId query parameter is required" });
            }
            if (!validateIdParam(propertyId, res, "propertyId")) return;

            const floors = await FloorModel.getByProperty(propertyId, req.user.organizationId);
            res.json(floors);
        } catch (error) {
            console.error("Failed to fetch floors:", error);
            res.status(500).json({ error: "Failed to fetch floors" });
        }
    },

    async create(req, res) {
        try {
            const { propertyId, name } = req.body;

            if (!propertyId || !name || !name.trim()) {
                return res.status(400).json({ error: "propertyId and name are required" });
            }

            const floor = await FloorModel.create(
                propertyId, name.trim(), req.user.organizationId
            );

            if (!floor) {
                return res.status(404).json({ error: "Property not found or access denied" });
            }

            res.status(201).json(floor);
        } catch (error) {
            console.error("Failed to create floor:", error);
            res.status(500).json({ error: "Failed to create floor" });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            if (!validateIdParam(id, res, "id")) return;

            const { name } = req.body;
            if (!name || !name.trim()) {
                return res.status(400).json({ error: "name is required" });
            }

            const updated = await FloorModel.update(id, name.trim(), req.user.organizationId);
            if (!updated) {
                return res.status(404).json({ error: "Floor not found" });
            }

            res.json(updated);
        } catch (error) {
            console.error("Failed to update floor:", error);
            res.status(500).json({ error: "Failed to update floor" });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            if (!validateIdParam(id, res, "id")) return;

            const deleted = await FloorModel.delete(id, req.user.organizationId);
            if (!deleted) {
                return res.status(404).json({ error: "Floor not found" });
            }

            res.json({ message: "Floor deleted" });
        } catch (error) {
            console.error("Failed to delete floor:", error);
            res.status(500).json({ error: "Failed to delete floor" });
        }
    }
};

module.exports = FloorController;
