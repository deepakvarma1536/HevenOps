const PropertyModel = require("../models/propertyModel");
const { validateIdParam } = require("../utils/validators");

const PropertyController = {
    async getAll(req, res) {
        try {
            const properties = await PropertyModel.getAll(req.user.organizationId, req.listOptions);
            res.json(properties);
        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "property list failed");
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
            req.log.error({ errorName: error.name, errorCode: error.code }, "property create failed");
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
            req.log.error({ errorName: error.name, errorCode: error.code }, "property update failed");
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
            req.log.error({ errorName: error.name, errorCode: error.code }, "property archive failed");
            res.status(500).json({ error: "Failed to delete property" });
        }
    }
};

module.exports = PropertyController;
