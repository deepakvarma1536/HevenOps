const { randomUUID } = require("node:crypto");
const pino = require("pino");

const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "password",
            "password_hash",
            "token",
            "invitationToken",
            "newPassword",
        ],
        censor: "[REDACTED]",
    },
});

function requestLogger(req, res, next) {
    const candidate = req.get("X-Request-ID");
    req.id = candidate && /^[A-Za-z0-9._:-]{1,128}$/.test(candidate)
        ? candidate
        : randomUUID();
    req.log = logger.child({ requestId: req.id });
    res.setHeader("X-Request-ID", req.id);

    const startedAt = process.hrtime.bigint();
    res.on("finish", () => {
        req.log.info({
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            durationMs: Number(process.hrtime.bigint() - startedAt) / 1e6,
        }, "request completed");
    });
    next();
}

module.exports = { logger, requestLogger };
