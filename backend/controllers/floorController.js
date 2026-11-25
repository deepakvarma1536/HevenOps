const FloorModel = require("../models/floorModel");
const { validateIdParam } = require("../utils/validators");
const { ApiError } = require("../utils/apiError");

const FloorController = {
    async getByProperty(req, res) {
        try {
            const { propertyId } = req.listOptions;

            if (!propertyId) {
                return res.status(400).json({ error: "propertyId query parameter is required" });
            }
            if (!validateIdParam(propertyId, res, "propertyId")) return;

            const floors = await FloorModel.getByProperty(propertyId, req.user.organizationId, req.listOptions);
            res.json(floors);
        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "floor list failed");
            res.status(500).json({ error: "Failed to fetch floors" });
        }
    },

    async create(req, res) {
        try {
            const { propertyId, name } = req.validated.body;

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
            if (error instanceof ApiError) throw error;
            if (error.code === "23505") return res.status(409).json({ error: "Floor name already exists in this property." });
            req.log.error({ errorName: error.name, errorCode: error.code }, "floor create failed");
            res.status(500).json({ error: "Failed to create floor" });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            if (!validateIdParam(id, res, "id")) return;

            const { name } = req.validated.body;
            if (!name || !name.trim()) {
                return res.status(400).json({ error: "name is required" });
            }

            const updated = await FloorModel.update(id, name.trim(), req.user.organizationId);
            if (!updated) {
                return res.status(404).json({ error: "Floor not found" });
            }

            res.json(updated);
        } catch (error) {
            if (error instanceof ApiError) throw error;
            if (error.code === "23505") return res.status(409).json({ error: "Floor name already exists in this property." });
            req.log.error({ errorName: error.name, errorCode: error.code }, "floor update failed");
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
            if (error instanceof ApiError) throw error;
            req.log.error({ errorName: error.name, errorCode: error.code }, "floor delete failed");
            res.status(500).json({ error: "Failed to delete floor" });
        }
    }
};

module.exports = FloorController;
