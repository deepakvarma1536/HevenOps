const express = require("express");
const pool = require("../config/db");
const { ApiError } = require("../utils/apiError");
const { paginateQuery } = require("../utils/pagination");
const { schemas } = require("../utils/requestSchemas");
const validateRequest = require("../middleware/validateRequest");
const { assignedProperty } = require("../middleware/propertyAccess");
const { authorize } = require("../middleware/authorize");
const { withLockedInventory, deleteInventory } = require("../models/propertyInventory");

const router = express.Router();

router.get("/", validateRequest(schemas.apartmentList), assignedProperty("floor", (req) => req.listOptions.floorId), async (req, res) => {
    const apartments = await paginateQuery(pool, {
        ...req.listOptions,
        select: "SELECT a.id, a.floor_id, a.name, a.created_at",
        fromWhere: `FROM apartments a JOIN floors f ON f.id = a.floor_id
            JOIN properties p ON p.id = f.property_id
            WHERE f.id = $1 AND p.organization_id = $2 AND f.archived_at IS NULL AND p.archived_at IS NULL`,
        values: [req.listOptions.floorId, req.user.organizationId],
        sortColumns: { id: "a.id", name: "a.name", created_at: "a.created_at" },
        tieColumn: "a.id",
    });
    res.json(apartments);
});

router.post("/", authorize("operations:write"), validateRequest(schemas.apartmentCreate),
    assignedProperty("floor", (req) => req.validated.body.floorId), async (req, res) => {
        const { floorId, name } = req.validated.body;
        try {
            const apartment = await withLockedInventory("floor", floorId, req.user.organizationId, async (client, floor) => {
                const { rows } = await client.query(
                    "INSERT INTO apartments (floor_id, name) VALUES ($1, $2) RETURNING *",
                    [floor.id, name]
                );
                return rows[0];
            });
            if (!apartment) throw new ApiError(404, "NOT_FOUND", "Floor not found.");
            res.status(201).json(apartment);
        } catch (error) {
            if (error.constraint === "apartments_floor_name_key") {
                throw new ApiError(409, "DUPLICATE_APARTMENT_NAME", "Apartment name already exists on this floor.");
            }
            throw error;
        }
    });

router.delete("/:id", authorize("*"), validateRequest(schemas.apartmentDelete), async (req, res) => {
    const deleted = await deleteInventory("apartment", req.validated.params.id, req.user.organizationId);
    if (!deleted) throw new ApiError(404, "NOT_FOUND", "Apartment not found.");
    res.json({ message: "Apartment deleted" });
});

module.exports = router;
