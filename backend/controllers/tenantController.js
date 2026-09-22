const TenantModel = require("../models/tenantModel");

const TenantController = {
    async getAll(req, res) {
        try {
            const tenants = await TenantModel.getAll();
            res.json(tenants);
        } catch (error) {
            console.error("Database query failed:", error);
            res.status(500).json({ error: "Failed to fetch tenants" });
        }
    }
};

module.exports = TenantController;
