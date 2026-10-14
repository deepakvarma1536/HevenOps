const { rateLimit } = require("express-rate-limit");
const { sendApiError } = require("../utils/apiError");

function createAuthRateLimit(windowMs, limit) {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        handler(req, res) {
            return sendApiError(
                req,
                res,
                429,
                "RATE_LIMITED",
                "Too many authentication attempts; try again later"
            );
        },
    });
}

module.exports = createAuthRateLimit;
