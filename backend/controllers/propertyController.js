const PropertyModel = require("../models/propertyModel");
const { validateIdParam } = require("../utils/validators");

const PropertyController = {
    async getAll(req, res) {
        try {
            const properties = await PropertyModel.getAll(req.user.organizationId);
            res.json(properties);
        } catch (error) {
            console.error("Failed to fetch properties:", error);
            res.status(500).json({ error: "Failed to fetch properties" });
        }
    },

    async create(req, res) {
        try {
            const { name } = req.body;
            if (!name || !name.trim()) {
                return res.status(400).json({ error: "name is required" });
            }

            const property = await PropertyModel.create(
                req.user.organizationId,
                name.trim()
            );

            res.status(201).json(property);
        } catch (error) {
            console.error("Failed to create property:", error);
            res.status(500).json({ error: "Failed to create property" });
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

            const updated = await PropertyModel.update(
                id, req.user.organizationId, name.trim()
            );

            if (!updated) {
                return res.status(404).json({ error: "Property not found" });
            }

            res.json(updated);
        } catch (error) {
            console.error("Failed to update property:", error);
            res.status(500).json({ error: "Failed to update property" });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            if (!validateIdParam(id, res, "id")) return;

            const deleted = await PropertyModel.delete(id, req.user.organizationId);
            if (!deleted) {
                return res.status(404).json({ error: "Property not found" });
            }

            res.json({ message: "Property deleted" });
        } catch (error) {
            console.error("Failed to delete property:", error);
            res.status(500).json({ error: "Failed to delete property" });
        }
    }
};

module.exports = PropertyController;
