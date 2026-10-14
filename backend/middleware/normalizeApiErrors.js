function normalizeApiErrors(req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = (payload) => {
        if (payload && typeof payload.error === "string") {
            const { error: message, ...details } = payload;
            const status = res.statusCode;
            payload = {
                error: {
                    code: status === 400 ? "BAD_REQUEST"
                        : status === 401 ? "UNAUTHORIZED"
                            : status === 403 ? "FORBIDDEN"
                                : status === 404 ? "NOT_FOUND"
                                    : status === 409 ? "CONFLICT"
                                        : "REQUEST_FAILED",
                    message,
                    ...(Object.keys(details).length ? { details } : {}),
                    requestId: req.id,
                },
            };
        }
        return originalJson(payload);
    };
    next();
}

module.exports = normalizeApiErrors;
