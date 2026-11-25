const pool = require("../config/db");
const { paginateQuery } = require("../utils/pagination");
const { ApiError } = require("../utils/apiError");
const { bedCapacity, findActiveRoom, countActiveBeds } = require("./roomInventory");
const { withLockedInventory, requireUniqueName, deleteInventory } = require("./propertyInventory");

function withCapacity(room) {
    return { ...room, bed_capacity: bedCapacity(room.room_type) };
}

const RoomModel = {
    async getByFloor(floorId, organizationId, options = {}) {
        const values = [floorId, organizationId];
        let fromWhere = `FROM rooms r
             JOIN floors f ON r.floor_id = f.id
             JOIN properties p ON f.property_id = p.id
             WHERE r.floor_id = $1 AND p.organization_id = $2
               AND r.archived_at IS NULL AND f.archived_at IS NULL AND p.archived_at IS NULL`;
        if (options.search) {
            values.push(`%${options.search}%`);
            fromWhere += ` AND r.room_number ILIKE $${values.length}`;
        }
        if (options.room_type) {
            values.push(options.room_type);
            fromWhere += ` AND r.room_type = $${values.length}`;
        }
        const page = await paginateQuery(pool, {
            select: "SELECT r.id, r.floor_id, r.room_number, r.room_type, r.created_at, r.updated_at",
            fromWhere,
            values,
            ...options,
            sortColumns: { id: "r.id", room_number: "r.room_number", room_type: "r.room_type", created_at: "r.created_at" },
            tieColumn: "r.id",
        });
        return { ...page, data: page.data.map(withCapacity) };
    },

    async getById(id, organizationId) {
        const room = await findActiveRoom(pool, id, organizationId);
        return room && withCapacity(room);
    },

    async create(floorId, roomNumber, roomType, organizationId) {
        return withLockedInventory("floor", floorId, organizationId, async (client, floor) => {
            await requireUniqueName(client, "room", floor.property_id, roomNumber);
            const result = await client.query(
                "INSERT INTO rooms (floor_id, room_number, room_type) VALUES ($1, $2, $3) RETURNING *",
                [floor.id, roomNumber, roomType]
            );
            return withCapacity(result.rows[0]);
        });
    },

    async update(id, roomNumber, roomType, organizationId) {
        return withLockedInventory("room", id, organizationId, async (client, room) => {
            if (roomNumber !== room.room_number) {
                await requireUniqueName(client, "room", room.property_id, roomNumber, room.id);
            }
            const nextType = roomType === undefined ? room.room_type : roomType;
            const capacity = bedCapacity(nextType);
            if (capacity !== null && capacity !== bedCapacity(room.room_type)) {
                const activeBeds = await countActiveBeds(client, room.id);
                if (activeBeds > capacity) {
                    throw new ApiError(409, "ROOM_CAPACITY_TOO_LOW", `Room ${room.room_number} already has ${activeBeds} active beds. Delete extra beds before setting a limit of ${capacity}.`);
                }
            }

            const result = await client.query(
                "UPDATE rooms SET room_number = $1, room_type = $2 WHERE id = $3 RETURNING *",
                [roomNumber, nextType, room.id]
            );
            return withCapacity(result.rows[0]);
        });
    },

    delete(id, organizationId) {
        return deleteInventory("room", id, organizationId);
    }
};

module.exports = RoomModel;
