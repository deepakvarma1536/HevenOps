const TenantModel = require("../models/tenantModel");
const { validateIdParam } = require("../utils/validators");

const TenantController = {
    async getAll(req, res) {
        try {
            const { organizationId } = req.query;

            if (!organizationId) {
                return res.status(400).json({
                    error: "organizationId query parameter is required"
                });
            }

            if (!validateIdParam(organizationId, res, "organizationId")) return;

            const tenants = await TenantModel.getAll(organizationId);
            res.json(tenants);
        } catch (error) {
            console.error("Database query failed:", error);
            res.status(500).json({ error: "Failed to fetch tenants" });
        }
    }
};

module.exports = TenantController;
