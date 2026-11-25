require("dotenv").config({ quiet: true });

const { randomUUID } = require("node:crypto");
const http = require("node:http");
const { loadEnv } = require("./config/env");
process.env.HEVENOPS_PROCESS_ROLE = "worker";
const pool = require("./config/db");
const { logger } = require("./middleware/requestLogger");
const { captureException } = require("./utils/errorTracker");
const { safeErrorMetadata } = require("./utils/safeErrorMetadata");
const {
    claimJob,
    completeJob,
    deadLetterExpiredJobs,
    extendJobLease,
    failJob,
    getJobCounts,
} = require("./jobs/jobQueue");
const { createJobHandlers, executeJob } = require("./jobs/handlers");
const { scheduleJobs } = require("./jobs/scheduler");

const env = loadEnv();
const workerId = `${process.env.HOSTNAME || "worker"}-${randomUUID()}`;
const handlers = createJobHandlers();
let stopping = false;
let lastHeartbeat = 0;
let activeJob = false;
let activeJobPromise = null;
let heartbeatTimer;

function metricsText(counts) {
    const lines = [
        "# HELP hevenops_worker_up Whether the worker process is alive.",
        "# TYPE hevenops_worker_up gauge",
        "hevenops_worker_up 1",
        "# HELP hevenops_worker_job_active Whether a job is currently executing.",
        "# TYPE hevenops_worker_job_active gauge",
        `hevenops_worker_job_active ${activeJob ? 1 : 0}`,
        "# HELP hevenops_worker_heartbeat_timestamp_seconds Last database heartbeat timestamp.",
        "# TYPE hevenops_worker_heartbeat_timestamp_seconds gauge",
        `hevenops_worker_heartbeat_timestamp_seconds ${lastHeartbeat / 1000}`,
        "# HELP hevenops_background_jobs Number of durable jobs by state.",
        "# TYPE hevenops_background_jobs gauge",
    ];
    for (const status of ["queued", "running", "succeeded", "dead"]) {
        lines.push(`hevenops_background_jobs{status="${status}"} ${counts[status] || 0}`);
    }
    return `${lines.join("\n")}\n`;
}

const metricsServer = http.createServer(async (req, res) => {
    if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
    }
    if (req.url === "/ready") {
        try {
            await pool.query("SELECT 1");
            const recentHeartbeat = Date.now() - lastHeartbeat < env.WORKER_HEARTBEAT_TIMEOUT_MS;
            res.writeHead(recentHeartbeat ? 200 : 503, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: recentHeartbeat ? "ready" : "starting" }));
        } catch (error) {
            logger.error(safeErrorMetadata(error), "worker readiness check failed");
            res.writeHead(503, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "not_ready" }));
        }
        return;
    }
    if (req.url === "/metrics") {
        try {
            const counts = await getJobCounts();
            res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" });
            res.end(metricsText(counts));
        } catch (error) {
            logger.error(safeErrorMetadata(error), "worker metrics collection failed");
            res.writeHead(503);
            res.end();
        }
        return;
    }
    res.writeHead(404);
    res.end();
});

async function heartbeat() {
    const { rows } = await pool.query(
        `INSERT INTO worker_heartbeats (worker_id, last_seen_at)
         VALUES ($1, CURRENT_TIMESTAMP)
         ON CONFLICT (worker_id) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at
         RETURNING to_char(CURRENT_DATE, 'YYYY-MM-DD') AS date_key`,
        [workerId]
    );
    lastHeartbeat = Date.now();
    return rows[0].date_key;
}

async function processNextJob() {
    await deadLetterExpiredJobs(env.JOB_LEASE_MS);
    const job = await claimJob(workerId, env.JOB_LEASE_MS);
    if (!job) return false;

    activeJob = true;
    const leaseTimer = setInterval(() => {
        extendJobLease(job.id, workerId, env.JOB_LEASE_MS).catch((error) => {
            logger.error({ jobId: job.id, ...safeErrorMetadata(error) }, "job lease renewal failed");
        });
    }, Math.max(500, Math.floor(env.JOB_LEASE_MS / 3)));
    leaseTimer.unref();
    try {
        const result = await executeJob(handlers, job);
        await completeJob(job.id, workerId);
        logger.info({ jobId: job.id, jobType: job.job_type, result }, "background job completed");
    } catch (error) {
        const outcome = await failJob(job, workerId, error, env.JOB_RETRY_BASE_MS);
        logger.error({
            jobId: job.id,
            jobType: job.job_type,
            attempt: job.attempts,
            deadLettered: outcome.dead,
            ...safeErrorMetadata(error),
        }, "background job failed");
        await captureException(error, { jobId: job.id, jobType: job.job_type });
    } finally {
        clearInterval(leaseTimer);
        activeJob = false;
    }
    return true;
}

async function run() {
    await pool.query("SELECT 1");
    await heartbeat();
    heartbeatTimer = setInterval(() => {
        heartbeat().catch((error) => {
            logger.error({ errorName: error.name, errorCode: error.code }, "worker heartbeat failed");
        });
    }, Math.max(1000, Math.floor(env.WORKER_HEARTBEAT_TIMEOUT_MS / 3)));
    heartbeatTimer.unref();
    metricsServer.listen(env.WORKER_METRICS_PORT, "0.0.0.0", () => {
        logger.info({ port: env.WORKER_METRICS_PORT, workerId }, "background worker started");
    });

    let lastScheduledDate = "";
    while (!stopping) {
        try {
            const dateKey = await heartbeat();
            if (dateKey !== lastScheduledDate) {
                await scheduleJobs(dateKey, {
                    reminderLeadDays: env.RENT_REMINDER_LEAD_DAYS,
                    maxAttempts: env.JOB_MAX_ATTEMPTS,
                });
                lastScheduledDate = dateKey;
            }
            activeJobPromise = processNextJob();
            if (!(await activeJobPromise)) {
                await new Promise((resolve) => setTimeout(resolve, env.JOB_POLL_INTERVAL_MS));
            }
            activeJobPromise = null;
        } catch (error) {
            logger.error(safeErrorMetadata(error), "worker loop failed");
            await captureException(error);
            await new Promise((resolve) => setTimeout(resolve, env.JOB_POLL_INTERVAL_MS));
        }
    }
}

async function shutdown(signal) {
    if (stopping) return;
    stopping = true;
    logger.info({ signal, workerId }, "worker shutdown started");
    clearInterval(heartbeatTimer);
    metricsServer.close();
    if (activeJobPromise) await activeJobPromise.catch(() => {});
    try {
        await pool.end();
        process.exitCode = 0;
    } catch (error) {
        logger.error(safeErrorMetadata(error), "worker database shutdown failed");
        process.exitCode = 1;
    }
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));

run().catch(async (error) => {
    logger.fatal(safeErrorMetadata(error), "worker startup failed");
    await captureException(error);
    await pool.end().catch(() => {});
    process.exitCode = 1;
});
