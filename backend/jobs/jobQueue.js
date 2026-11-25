const pool = require("../config/db");
const { safeErrorMetadata } = require("../utils/safeErrorMetadata");

async function enqueueJob(jobType, idempotencyKey, payload = {}, options = {}, db = pool) {
    const result = await db.query(
        `INSERT INTO background_jobs (job_type, idempotency_key, payload, max_attempts, run_at)
         VALUES ($1, $2, $3::jsonb, $4, COALESCE($5::timestamptz, CURRENT_TIMESTAMP))
         ON CONFLICT (idempotency_key) DO NOTHING
         RETURNING id, job_type, idempotency_key, status`,
        [jobType, idempotencyKey, JSON.stringify(payload), options.maxAttempts || 5, options.runAt || null]
    );
    return result.rows[0] || null;
}

async function claimJob(workerId, leaseMs, db = pool) {
    const result = await db.query(
        `UPDATE background_jobs
         SET status = 'running', attempts = attempts + 1,
             locked_at = CURRENT_TIMESTAMP, locked_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = (
             SELECT id FROM background_jobs
             WHERE (status = 'queued' AND run_at <= CURRENT_TIMESTAMP)
                OR (status = 'running' AND locked_at < CURRENT_TIMESTAMP - ($2 * INTERVAL '1 millisecond'))
             ORDER BY run_at, id
             FOR UPDATE SKIP LOCKED
             LIMIT 1
         )
         RETURNING id, job_type, idempotency_key, payload, attempts, max_attempts`,
        [workerId, leaseMs]
    );
    return result.rows[0] || null;
}

async function completeJob(jobId, workerId, db = pool) {
    await db.query(
        `UPDATE background_jobs
         SET status = 'succeeded', locked_at = NULL, locked_by = NULL,
             last_error = NULL, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'running' AND locked_by = $2`,
        [jobId, workerId]
    );
}

async function extendJobLease(jobId, workerId, leaseMs, db = pool) {
    const result = await db.query(
        `UPDATE background_jobs
         SET locked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'running' AND locked_by = $2
         RETURNING id`,
        [jobId, workerId]
    );
    return result.rowCount > 0;
}

async function failJob(job, workerId, error, retryBaseMs, db = pool) {
    const dead = job.attempts >= job.max_attempts;
    const retryDelayMs = Math.min(retryBaseMs * (2 ** Math.max(0, job.attempts - 1)), 3600000);
    const safe = safeErrorMetadata(error);
    const safeError = [safe.errorName, safe.errorCode].filter(Boolean).join(":");
    await db.query(
        `UPDATE background_jobs
         SET status = $3, run_at = CASE WHEN $3 = 'queued'
                THEN CURRENT_TIMESTAMP + ($4 * INTERVAL '1 millisecond') ELSE run_at END,
             locked_at = NULL, locked_by = NULL, last_error = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'running' AND locked_by = $2`,
        [job.id, workerId, dead ? "dead" : "queued", retryDelayMs, safeError]
    );
    return { dead, retryDelayMs };
}

async function deadLetterExpiredJobs(leaseMs = 60000, db = pool) {
    const result = await db.query(
        `UPDATE background_jobs
         SET status = 'dead', locked_at = NULL, locked_by = NULL,
             last_error = COALESCE(last_error, 'Worker lease expired after final attempt'),
             updated_at = CURRENT_TIMESTAMP
         WHERE status = 'running' AND attempts >= max_attempts
           AND locked_at < CURRENT_TIMESTAMP - ($1 * INTERVAL '1 millisecond')
         RETURNING id`,
        [leaseMs]
    );
    return result.rowCount;
}

async function getJobCounts(db = pool) {
    const result = await db.query(
        `SELECT status, COUNT(*)::bigint AS count
         FROM background_jobs GROUP BY status`
    );
    return Object.fromEntries(result.rows.map(({ status, count }) => [status, Number(count)]));
}

module.exports = {
    enqueueJob,
    claimJob,
    completeJob,
    extendJobLease,
    failJob,
    deadLetterExpiredJobs,
    getJobCounts,
};
