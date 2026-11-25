const pool = require("../config/db");
const { ApiError } = require("../utils/apiError");

const scopes = {
    property: { alias: "p", joins: "", active: "" },
    floor: {
        alias: "f",
        columns: "f.id, f.name",
        joins: "JOIN floors f ON f.property_id = p.id",
        active: "AND f.archived_at IS NULL",
    },
    room: {
        alias: "r",
        columns: "r.id, r.room_type, r.room_number",
        joins: "JOIN floors f ON f.property_id = p.id JOIN rooms r ON r.floor_id = f.id",
        active: "AND f.archived_at IS NULL AND r.archived_at IS NULL",
    },
    bed: {
        alias: "b",
        columns: "b.id",
        joins: `JOIN floors f ON f.property_id = p.id
                JOIN rooms r ON r.floor_id = f.id
                JOIN beds b ON b.room_id = r.id`,
        active: "AND f.archived_at IS NULL AND r.archived_at IS NULL AND b.archived_at IS NULL",
    },
};

async function withLockedInventory(scope, id, organizationId, change) {
    const { alias, columns, joins, active } = scopes[scope];
    const location = `FROM properties p ${joins}
        WHERE ${alias}.id = $1 AND p.organization_id = $2 AND p.archived_at IS NULL ${active}`;
    const values = [id, organizationId];
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        // Serialize name checks and writes across the property before locking floors or rooms.
        const property = await client.query(`SELECT p.id AS property_id ${location} FOR NO KEY UPDATE OF p`, values);
        let record = property.rows[0];
        if (record && scope !== "property") {
            const { rows } = await client.query(
                `SELECT ${columns}, p.id AS property_id ${location} FOR UPDATE OF ${alias}`,
                values
            );
            record = rows[0];
        }
        const result = record ? await change(client, record) : null;
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

const names = {
    floor: { from: "floors f", column: "f.name", id: "f.id", label: "Floor name" },
    room: { from: "rooms r JOIN floors f ON r.floor_id = f.id", column: "r.room_number", id: "r.id", label: "Room number" },
    bed: {
        from: "beds b JOIN rooms r ON b.room_id = r.id JOIN floors f ON r.floor_id = f.id",
        column: "b.bed_number",
        id: "b.id",
        label: "Bed number",
    },
};

async function requireUniqueName(client, kind, propertyId, name, excludeId = null) {
    const { from, column, id, label } = names[kind];
    const result = await client.query(
        `SELECT 1 FROM ${from}
         WHERE f.property_id = $1 AND lower(btrim(${column})) = lower(btrim($2))
           AND ($3::bigint IS NULL OR ${id} <> $3)
         LIMIT 1`,
        [propertyId, name, excludeId]
    );
    if (result.rows.length) {
        throw new ApiError(409, `DUPLICATE_${kind.toUpperCase()}_NAME`, `${label} already exists in this property.`);
    }
}

const inventoryTables = { property: "properties", floor: "floors", room: "rooms", bed: "beds" };

async function deleteInventory(scope, id, organizationId) {
    try {
        return await withLockedInventory(scope, id, organizationId, async (client) => {
            const { rows } = await client.query(
                `DELETE FROM ${inventoryTables[scope]} WHERE id = $1 RETURNING id`,
                [id]
            );
            return rows[0];
        });
    } catch (error) {
        if (error.constraint === "stays_bed_id_fkey" && ["23503", "23001"].includes(error.code)) {
            throw new ApiError(409, "INVENTORY_HAS_STAYS", "This record cannot be deleted because a bed is linked to a current or past stay.");
        }
        throw error;
    }
}

module.exports = { withLockedInventory, requireUniqueName, deleteInventory };
