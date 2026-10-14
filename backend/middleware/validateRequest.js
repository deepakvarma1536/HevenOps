const { ApiError } = require("../utils/apiError");

function validateRequest(schema) {
    return (req, res, next) => {
        const result = schema.safeParse({
            params: req.params,
            query: req.query,
            body: req.body ?? {},
            headers: req.headers,
        });

        if (!result.success) {
            const details = result.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
            }));
            return next(new ApiError(400, "VALIDATION_ERROR", "Request validation failed", details));
        }

        req.validated = result.data;
        req.listOptions = result.data.query;
        return next();
    };
}

module.exports = validateRequest;
