const PropertyModel = require("../models/propertyModel");
const { validateIdParam } = require("../utils/validators");

const PropertyController = {
    async getByOrganization(req, res) {
        try {
            const { organizationId } = req.params;

            if (!validateIdParam(organizationId, res, "organizationId")) return;

            const properties = await PropertyModel.getByOrganization(organizationId);
            res.json(properties);
        } catch (error) {
            console.error("Database query failed:", error);
            res.status(500).json({ error: "Failed to fetch properties" });
        }
    }
};

module.exports = PropertyController;
