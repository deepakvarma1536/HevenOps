const PropertyModel = require("../models/propertyModel");

const PropertyController = {
    async getByOrganization(req, res) {
        try {
            const { organizationId } = req.params;
            const properties = await PropertyModel.getByOrganization(organizationId);
            res.json(properties);
        } catch (error) {
            console.error("Database query failed:", error);
            res.status(500).json({ error: "Failed to fetch properties" });
        }
    }
};

module.exports = PropertyController;
