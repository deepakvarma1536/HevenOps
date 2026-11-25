const pool = require("../config/db");
const { netPaidFor } = require("../models/rentDueBalance");
const { generateRentCycles } = require("../models/scheduledRent");

function createJobHandlers(dependencies = {}) {
    const db = dependencies.db || pool;
    const generate = dependencies.generateRentCycles || generateRentCycles;

    return {
        async "generate-rent"(payload) {
            return generate(db, payload.runDate);
        },

        async "mark-overdue"() {
            const result = await db.query(
                `UPDATE rent_dues rd
                 SET status = 'OVERDUE', updated_at = CURRENT_TIMESTAMP
                 WHERE rd.due_date < CURRENT_DATE
                   AND rd.status IN ('DUE', 'PARTIALLY_PAID')
                   AND rd.amount_paise > (${netPaidFor("rd.id")})`
            );
            return { marked: result.rowCount };
        },

        async "create-rent-reminders"(payload) {
            const result = await db.query(
                `INSERT INTO tenant_notifications
                    (organization_id, tenant_id, notification_type, title, body, idempotency_key)
                 SELECT s.organization_id, s.tenant_id, 'RENT_REMINDER',
                        'Rent payment reminder',
                        'Rent for ' || to_char(rd.due_month, 'YYYY-MM') || ' is due on ' ||
                            to_char(rd.due_date, 'YYYY-MM-DD') || '. Please contact your property manager if you have already paid.',
                        'rent-reminder:' || rd.id || ':' || $1
                 FROM rent_dues rd
                 JOIN stays s ON s.id = rd.stay_id
                 JOIN tenants t ON t.id = s.tenant_id
                 WHERE rd.due_date <= CURRENT_DATE + ($2 * INTERVAL '1 day')
                   AND rd.due_date >= CURRENT_DATE
                   AND rd.status IN ('DUE', 'PARTIALLY_PAID')
                   AND t.archived_at IS NULL
                   AND rd.amount_paise > (${netPaidFor("rd.id")})
                 ON CONFLICT (idempotency_key) DO NOTHING`,
                [payload.runDate, payload.leadDays]
            );
            return { created: result.rowCount };
        },
    };
}

async function executeJob(handlers, job) {
    const handler = handlers[job.job_type];
    if (!handler) {
        throw Object.assign(new Error("Unknown job type"), { code: "UNKNOWN_JOB_TYPE" });
    }
    return handler(job.payload);
}

module.exports = { createJobHandlers, executeJob };
