const OrganizationModel = require("../models/organizationModel");

const OrganizationController = {
    async getAll(req, res) {
        try {
            const organizations = await OrganizationModel.getAll();
            res.json(organizations);
        } catch (error) {
            console.error("Database query failed:", error);
            res.status(500).json({ error: "Failed to fetch organizations" });
        }
    }
};

module.exports = OrganizationController;
