const pool = require("../config/db");
const { paginateQuery } = require("../utils/pagination");
const { ApiError } = require("../utils/apiError");
const { bedCapacity, countActiveBeds } = require("./roomInventory");
const { withLockedInventory, requireUniqueName, deleteInventory } = require("./propertyInventory");

const BedModel = {
    async getByRoom(roomId, organizationId, options = {}) {
        const values = [roomId, organizationId];
        let fromWhere = `FROM beds b
             JOIN rooms r ON b.room_id = r.id
             JOIN floors f ON r.floor_id = f.id
             JOIN properties p ON f.property_id = p.id
             WHERE b.room_id = $1 AND p.organization_id = $2
               AND b.archived_at IS NULL AND r.archived_at IS NULL
               AND f.archived_at IS NULL AND p.archived_at IS NULL`;
        if (options.status) {
            values.push(options.status);
            fromWhere += ` AND b.status = $${values.length}`;
        }
        return paginateQuery(pool, {
            select: "SELECT b.id, b.room_id, b.bed_number, b.monthly_rent_paise, b.status, b.created_at, b.updated_at",
            fromWhere,
            values,
            ...options,
            sortColumns: { id: "b.id", bed_number: "b.bed_number", monthly_rent_paise: "b.monthly_rent_paise", status: "b.status", created_at: "b.created_at" },
            tieColumn: "b.id",
        });
    },

    async getById(id, organizationId) {
        const result = await pool.query(
            `SELECT b.* FROM beds b
             JOIN rooms r ON b.room_id = r.id
             JOIN floors f ON r.floor_id = f.id
             JOIN properties p ON f.property_id = p.id
             WHERE b.id = $1 AND p.organization_id = $2
               AND b.archived_at IS NULL AND r.archived_at IS NULL
               AND f.archived_at IS NULL AND p.archived_at IS NULL`,
            [id, organizationId]
        );
        return result.rows[0];
    },

    async create(roomId, bedNumber, organizationId) {
        return withLockedInventory("room", roomId, organizationId, async (client, room) => {
            await requireUniqueName(client, "bed", room.property_id, bedNumber);
            const capacity = bedCapacity(room.room_type);
            if (capacity !== null && await countActiveBeds(client, room.id) >= capacity) {
                throw new ApiError(409, "ROOM_CAPACITY_REACHED", `Room ${room.room_number} is full. Its bed limit is ${capacity}.`);
            }

            const result = await client.query(
                `INSERT INTO beds (room_id, bed_number)
                 VALUES ($1, $2)
                 RETURNING *`,
                [room.id, bedNumber]
            );
            return result.rows[0];
        });
    },

    async updateStatus(id, status, organizationId) {
        const result = await pool.query(
            `UPDATE beds SET status = $1
             WHERE id = $2 AND archived_at IS NULL AND room_id IN (
                 SELECT r.id FROM rooms r
                 JOIN floors f ON r.floor_id = f.id
                 JOIN properties p ON f.property_id = p.id
                 WHERE p.organization_id = $3 AND r.archived_at IS NULL AND f.archived_at IS NULL AND p.archived_at IS NULL
             )
             RETURNING *`,
            [status, id, organizationId]
        );
        return result.rows[0];
    },

    delete(id, organizationId) {
        return deleteInventory("bed", id, organizationId);
    }
};

module.exports = BedModel;
