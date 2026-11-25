const pool = require("../config/db");
const { ApiError } = require("../utils/apiError");

const propertyJoins = `
    JOIN floors f ON f.property_id = p.id
    JOIN rooms r ON r.floor_id = f.id
    JOIN beds b ON b.room_id = r.id`;

const stayJoins = `${propertyJoins} JOIN stays s ON s.bed_id = b.id`;
const dueJoins = `${stayJoins} JOIN rent_dues rd ON rd.stay_id = s.id`;

const resources = {
    property: ["", "p.id"],
    floor: ["JOIN floors f ON f.property_id = p.id", "f.id"],
    room: ["JOIN floors f ON f.property_id = p.id JOIN rooms r ON r.floor_id = f.id", "r.id"],
    bed: [propertyJoins, "b.id"],
    stay: [stayJoins, "s.id"],
    due: [dueJoins, "rd.id"],
    payment: [`${dueJoins} JOIN payments pay ON pay.rent_due_id = rd.id`, "pay.id"],
};

const tenantProperty = `COALESCE(
    (SELECT f.property_id FROM stays s JOIN beds b ON b.id = s.bed_id
      JOIN rooms r ON r.id = b.room_id JOIN floors f ON f.id = r.floor_id
      WHERE s.tenant_id = t.id
      ORDER BY s.move_out_date DESC NULLS FIRST, s.id DESC LIMIT 1),
    t.intake_property_id)`;

function propertyScope(req, _res, next) {
    if (req.user.role === "manager") req.listOptions.managerId = req.user.userId;
    next();
}

function ownerOrStaff(req, _res, next) {
    if (req.user.role === "manager") throw new ApiError(403, "PROPERTY_SCOPE_REQUIRED", "This action requires organization-wide access");
    next();
}

function assignedProperty(resource, getId, { checkAll = false } = {}) {
    return async (req, _res, next) => {
        const manager = req.user.role === "manager";
        if (!manager && !checkAll) return next();
        const id = getId(req);
        if (id == null && !manager) return next();
        if (!/^[1-9]\d{0,18}$/.test(String(id)) || BigInt(id) > 9223372036854775807n) {
            throw new ApiError(400, "VALIDATION_ERROR", "A valid property or record must be selected");
        }

        const [joins, column] = resource === "tenant"
            ? [`JOIN tenants t ON t.organization_id = p.organization_id AND ${tenantProperty} = p.id`, "t.id"]
            : resources[resource];
        const result = await pool.query(
            `SELECT 1 FROM properties p ${joins}
             WHERE p.organization_id = $1 AND ${column} = $2 AND p.archived_at IS NULL
               AND ($3::bigint IS NULL OR EXISTS (
                   SELECT 1 FROM manager_properties mp
                   WHERE mp.organization_id = p.organization_id AND mp.property_id = p.id AND mp.user_id = $3
               )) LIMIT 1`,
            [req.user.organizationId, id, manager ? req.user.userId : null]
        );
        if (!result.rowCount) throw new ApiError(404, "NOT_FOUND", "Record not found");
        next();
    };
}

module.exports = { assignedProperty, propertyScope, ownerOrStaff, tenantProperty };
