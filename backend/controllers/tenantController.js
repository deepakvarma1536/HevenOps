const TenantModel = require("../models/tenantModel");
const { validateIdParam } = require("../utils/validators");

const TenantController = {
    async getAll(req, res) {
        try {
            const tenants = await TenantModel.getAll(req.user.organizationId, req.listOptions);
            res.json(tenants);
        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "tenant list failed");
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
            req.log.error({ errorName: error.name, errorCode: error.code }, "tenant fetch failed");
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
            req.log.error({ errorName: error.name, errorCode: error.code }, "tenant create failed");
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
            req.log.error({ errorName: error.name, errorCode: error.code }, "tenant update failed");
            res.status(500).json({ error: "Failed to update tenant" });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            if (!validateIdParam(id, res, "id")) return;

            const deleted = await TenantModel.delete(id, req.user.organizationId);
            if (!deleted) {
                return res.status(404).json({ error: "Tenant not found" });
            }

            res.json({ message: "Tenant deleted" });
        } catch (error) {
            if (error.message === "TENANT_HAS_ACTIVE_STAY") {
                return res.status(409).json({
                    error: "Cannot delete tenant with an active stay — checkout first"
                });
            }
            req.log.error({ errorName: error.name, errorCode: error.code }, "tenant archive failed");
            res.status(500).json({ error: "Failed to delete tenant" });
        }
    }
};

module.exports = TenantController;
