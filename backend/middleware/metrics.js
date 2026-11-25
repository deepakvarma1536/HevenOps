const { getJobCounts } = require("../jobs/jobQueue");
const { safeErrorMetadata } = require("../utils/safeErrorMetadata");

const requestCounts = new Map();

function metricsMiddleware(req, res, next) {
    res.once("finish", () => {
        const key = `${req.method}|${res.statusCode}`;
        requestCounts.set(key, (requestCounts.get(key) || 0) + 1);
    });
    next();
}

async function metricsHandler(req, res) {
    try {
        const jobCounts = await getJobCounts();
        const lines = [
            "# HELP hevenops_process_up Whether the API process is alive.",
            "# TYPE hevenops_process_up gauge",
            "hevenops_process_up 1",
            "# HELP hevenops_process_uptime_seconds API process uptime.",
            "# TYPE hevenops_process_uptime_seconds gauge",
            `hevenops_process_uptime_seconds ${process.uptime()}`,
            "# HELP hevenops_http_requests_total Completed HTTP requests by method and status.",
            "# TYPE hevenops_http_requests_total counter",
        ];
        for (const [key, count] of requestCounts) {
            const [method, status] = key.split("|");
            lines.push(`hevenops_http_requests_total{method="${method}",status="${status}"} ${count}`);
        }
        lines.push(
            "# HELP hevenops_background_jobs Number of durable background jobs by state.",
            "# TYPE hevenops_background_jobs gauge"
        );
        for (const status of ["queued", "running", "succeeded", "dead"]) {
            lines.push(`hevenops_background_jobs{status="${status}"} ${jobCounts[status] || 0}`);
        }
        res.type("text/plain; version=0.0.4; charset=utf-8").send(`${lines.join("\n")}\n`);
    } catch (error) {
        req.log.error(safeErrorMetadata(error), "metrics collection failed");
        res.status(503).type("text/plain").send("metrics temporarily unavailable\n");
    }
}

module.exports = { metricsMiddleware, metricsHandler };
