const TenantModel = require("../models/tenantModel");
const { validateIdParam } = require("../utils/validators");

const TenantController = {
    async getAll(req, res) {
        try {
            const tenants = await TenantModel.getAll(req.user.organizationId);
            res.json(tenants);
        } catch (error) {
            console.error("Failed to fetch tenants:", error);
            res.status(500).json({ error: "Failed to fetch tenants" });
        }
    },

    async getById(req, res) {
        try {
            const { id } = req.params;
            if (!validateIdParam(id, res, "id")) return;

            const tenant = await TenantModel.getById(id, req.user.organizationId);
            if (!tenant) {
                return res.status(404).json({ error: "Tenant not found" });
            }

            res.json(tenant);
        } catch (error) {
            console.error("Failed to fetch tenant:", error);
            res.status(500).json({ error: "Failed to fetch tenant" });
        }
    },

    async create(req, res) {
        try {
            const { name, phone, email } = req.body;

            if (!name || !name.trim() || !phone || !phone.trim()) {
                return res.status(400).json({ error: "name and phone are required" });
            }

            const tenant = await TenantModel.create(
                req.user.organizationId,
                name.trim(),
                phone.trim(),
                email ? email.trim() : null
            );

            res.status(201).json(tenant);
        } catch (error) {
            console.error("Failed to create tenant:", error);
            res.status(500).json({ error: "Failed to create tenant" });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            if (!validateIdParam(id, res, "id")) return;

            const { name, phone, email } = req.body;

            if (!name || !name.trim() || !phone || !phone.trim()) {
                return res.status(400).json({ error: "name and phone are required" });
            }

            const updated = await TenantModel.update(
                id,
                req.user.organizationId,
                name.trim(),
                phone.trim(),
                email ? email.trim() : null
            );

            if (!updated) {
                return res.status(404).json({ error: "Tenant not found" });
            }

            res.json(updated);
        } catch (error) {
            console.error("Failed to update tenant:", error);
            res.status(500).json({ error: "Failed to update tenant" });
        }
    }
};

module.exports = TenantController;
