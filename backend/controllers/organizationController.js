const OrganizationModel = require("../models/organizationModel");
const { validateIdParam } = require("../utils/validators");

const OrganizationController = {
    async getAll(req, res) {
        try {
            const organizations = await OrganizationModel.getByUser(req.user.userId);
            res.json(organizations);
        } catch (error) {
            console.error("Failed to fetch organizations:", error);
            res.status(500).json({ error: "Failed to fetch organizations" });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            if (!validateIdParam(id, res, "id")) return;

            // Only allow updating your own organization
            if (parseInt(id) !== req.user.organizationId) {
                return res.status(403).json({ error: "Access denied" });
            }

            const { name } = req.body;
            if (!name || !name.trim()) {
                return res.status(400).json({ error: "name is required" });
            }

            const updated = await OrganizationModel.update(id, name.trim());
            if (!updated) {
                return res.status(404).json({ error: "Organization not found" });
            }

            res.json(updated);
        } catch (error) {
            console.error("Failed to update organization:", error);
            res.status(500).json({ error: "Failed to update organization" });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            if (!validateIdParam(id, res, "id")) return;

            if (parseInt(id) !== req.user.organizationId) {
                return res.status(403).json({ error: "Access denied" });
            }

            const deleted = await OrganizationModel.delete(id);
            if (!deleted) {
                return res.status(404).json({ error: "Organization not found" });
            }

            res.json({ message: "Organization deleted" });
        } catch (error) {
            console.error("Failed to delete organization:", error);
            res.status(500).json({ error: "Failed to delete organization" });
        }
    }
};

module.exports = OrganizationController;
