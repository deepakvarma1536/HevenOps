const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const pool = require("./config/db");
const openApiDocument = require("./openapi.json");
const { ApiError, errorHandler, notFoundHandler, sendApiError } = require("./utils/apiError");
const normalizeApiErrors = require("./middleware/normalizeApiErrors");
const { requestLogger } = require("./middleware/requestLogger");
const createAuthRateLimit = require("./middleware/authRateLimit");

function createApp(env) {
    const app = express();
    const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
    const authRateLimit = createAuthRateLimit(env.AUTH_RATE_LIMIT_WINDOW_MS, env.AUTH_RATE_LIMIT_MAX);

    app.disable("x-powered-by");
    app.use(requestLogger);
    app.use((req, res, next) => {
        if (req.path === "/api-docs" || req.path.startsWith("/api-docs/")) {
            return helmet({ contentSecurityPolicy: false })(req, res, next);
        }
        return helmet()(req, res, next);
    });
    app.use(cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new ApiError(403, "CORS_ORIGIN_DENIED", "Origin is not allowed"));
        },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Request-ID"],
        exposedHeaders: ["X-Request-ID"],
        credentials: true,
        maxAge: 600,
    }));
    app.use(express.json({ limit: "64kb", strict: true }));
    app.use(normalizeApiErrors);

    const healthHandler = (req, res) => res.status(200).json({ status: "ok" });
    app.get("/health", healthHandler);
    app.get("/api/health", healthHandler);
    const readinessHandler = async (req, res) => {
        try {
            await pool.query("SELECT 1");
            return res.status(200).json({ status: "ready", database: "available" });
        } catch (error) {
            req.log.error({ requestId: req.id, errorName: error.name, errorCode: error.code }, "readiness check failed");
            return sendApiError(req, res, 503, "DATABASE_NOT_READY", "Database is unavailable");
        }
    };
    app.get("/ready", readinessHandler);
    app.get("/api/ready", readinessHandler);
    app.get("/openapi.json", (req, res) => res.json(openApiDocument));
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument, { swaggerOptions: { persistAuthorization: false } }));

    const authRoutes = require("./routes/authRoutes");
    const organizationRoutes = require("./routes/organizationRoutes");
    const propertyRoutes = require("./routes/propertyRoutes");
    const floorRoutes = require("./routes/floorRoutes");
    const roomRoutes = require("./routes/roomRoutes");
    const bedRoutes = require("./routes/bedRoutes");
    const tenantRoutes = require("./routes/tenantRoutes");
    const stayRoutes = require("./routes/stayRoutes");
    const rentDueRoutes = require("./routes/rentDueRoutes");
    const paymentRoutes = require("./routes/paymentRoutes");
    const depositRoutes = require("./routes/depositRoutes");
    const tenantAuthRoutes = require("./routes/tenantAuthRoutes");
    const tenantPortalRoutes = require("./routes/tenantPortalRoutes");
    const authenticate = require("./middleware/authenticate");

    app.use("/api/auth", authRateLimit, authRoutes);
    app.use("/api/tenant-auth", authRateLimit, tenantAuthRoutes);
    app.use("/api/tenant-portal", tenantPortalRoutes);

    app.use("/api", authenticate);
    app.use("/api/organizations", organizationRoutes);
    app.use("/api/properties", propertyRoutes);
    app.use("/api/floors", floorRoutes);
    app.use("/api/rooms", roomRoutes);
    app.use("/api/beds", bedRoutes);
    app.use("/api/tenants", tenantRoutes);
    app.use("/api/stays", stayRoutes);
    app.use("/api/rent-dues", rentDueRoutes);
    app.use("/api/payments", paymentRoutes);
    app.use("/api/deposits", depositRoutes);

    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
}

module.exports = { createApp };
