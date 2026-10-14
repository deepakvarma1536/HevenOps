class ApiError extends Error {
    constructor(status, code, message, details) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

function sendApiError(req, res, status, code, message, details) {
    return res.status(status).json({
        error: {
            code,
            message,
            ...(details === undefined ? {} : { details }),
            requestId: req.id,
        },
    });
}

function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);

    const isApiError = error instanceof ApiError;
    const reportedStatus = error.statusCode || error.status;
    const status = isApiError
        ? error.status
        : Number.isInteger(reportedStatus) && reportedStatus >= 400 && reportedStatus < 500
            ? reportedStatus
            : 500;
    const code = isApiError
        ? error.code
        : status === 413
            ? "PAYLOAD_TOO_LARGE"
            : error.type === "entity.parse.failed"
                ? "INVALID_JSON"
                : "INTERNAL_SERVER_ERROR";
    const message = isApiError
        ? error.message
        : status === 413
            ? "Request body exceeds the allowed size"
            : code === "INVALID_JSON"
                ? "Request body contains invalid JSON"
                : "An unexpected error occurred";

    if (status >= 500) {
        req.log?.error({ requestId: req.id, errorName: error.name, errorCode: error.code }, "request failed");
    }
    return sendApiError(req, res, status, code, message, isApiError ? error.details : undefined);
}

function notFoundHandler(req, res) {
    return sendApiError(req, res, 404, "NOT_FOUND", "Route not found");
}

module.exports = { ApiError, errorHandler, notFoundHandler, sendApiError };
