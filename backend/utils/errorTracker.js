const { logger } = require("../middleware/requestLogger");
const { safeErrorMetadata, safeIdentifier } = require("./safeErrorMetadata");

async function captureException(error, context = {}) {
    const metadata = safeErrorMetadata(error);
    const event = {
        ...metadata,
        requestId: context.requestId,
        jobId: context.jobId,
        jobType: safeIdentifier(context.jobType, undefined),
    };
    logger.error(event, "exception captured");

    const endpoint = process.env.ERROR_TRACKING_WEBHOOK_URL;
    if (!endpoint) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...event, occurredAt: new Date().toISOString() }),
            signal: controller.signal,
        });
        if (!response.ok) {
            logger.warn({ statusCode: response.status }, "error tracking webhook rejected event");
        }
    } catch (hookError) {
        logger.warn({ errorName: hookError.name }, "error tracking webhook unavailable");
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = { captureException };
