require("dotenv").config();

const { loadEnv } = require("./config/env");
const { logger } = require("./middleware/requestLogger");

async function start() {
    const env = loadEnv();
    const { createApp } = require("./app");
    const pool = require("./config/db");
    const app = createApp(env);
    const server = app.listen(env.PORT, () => {
        logger.info({ port: env.PORT, environment: env.NODE_ENV }, "HevenOps API started");
    });

    let shuttingDown = false;
    let shutdownTimer;
    const shutdown = (signal) => {
        if (shuttingDown) return;
        shuttingDown = true;
        logger.info({ signal }, "graceful shutdown started");
        shutdownTimer = setTimeout(() => {
            logger.warn({ signal }, "graceful shutdown deadline reached; closing open connections");
            server.closeAllConnections();
        }, 10000);
        shutdownTimer.unref();
        server.close((serverError) => {
            clearTimeout(shutdownTimer);
            if (serverError) {
                logger.error({ errorName: serverError.name, errorCode: serverError.code }, "HTTP server shutdown failed");
                process.exitCode = 1;
            }
            pool.end()
                .then(() => logger.info("database pool closed"))
                .catch((error) => {
                    logger.error({ errorName: error.name, errorCode: error.code }, "database pool shutdown failed");
                    process.exitCode = 1;
                });
        });
        server.closeIdleConnections();
    };

    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));
    return server;
}

start().catch((error) => {
    logger.fatal({ errorName: error.name }, error.message);
    process.exitCode = 1;
});
