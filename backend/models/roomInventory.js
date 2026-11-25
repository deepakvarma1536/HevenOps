const namedCapacities = { single: 1, twin: 2, double: 2, triple: 3, quad: 4, quadruple: 4 };

function bedCapacity(roomType) {
    const type = roomType?.trim().toLowerCase() || "";
    const numeric = /^(\d+)[\s-]*(?:sharing|beds?)\b/.exec(type);
    if (numeric) {
        const capacity = Number(numeric[1]);
        return Number.isSafeInteger(capacity) && capacity > 0 ? capacity : null;
    }
    const named = /^(single|twin|double|triple|quad|quadruple)(?:[\s-]+(?:sharing|room)\b|$)/.exec(type);
    return named ? namedCapacities[named[1]] : null;
}

async function findActiveRoom(db, roomId, organizationId) {
    const result = await db.query(
        `SELECT r.* FROM rooms r
         JOIN floors f ON r.floor_id = f.id
         JOIN properties p ON f.property_id = p.id
         WHERE r.id = $1 AND p.organization_id = $2
           AND r.archived_at IS NULL AND f.archived_at IS NULL AND p.archived_at IS NULL`,
        [roomId, organizationId]
    );
    return result.rows[0];
}

async function countActiveBeds(db, roomId) {
    const { rows } = await db.query(
        "SELECT COUNT(*)::int AS count FROM beds WHERE room_id = $1 AND archived_at IS NULL",
        [roomId]
    );
    return rows[0].count;
}

module.exports = { bedCapacity, findActiveRoom, countActiveBeds };
