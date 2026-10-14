const { z } = require("zod");

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z.string().min(1).optional(),
    DB_HOST: z.string().min(1).optional(),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
    DB_DATABASE: z.string().min(1).optional(),
    DB_USER: z.string().min(1).optional(),
    DB_PASSWORD: z.string().min(1).optional(),
    DB_SSL: z.enum(["true", "false"]).default("false"),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(100).max(120000).default(5000),
    DB_IDLE_TIMEOUT_MS: z.coerce.number().int().min(100).max(120000).default(10000),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN: z.string().min(1).default("15m"),
    CORS_ORIGIN: z.string().min(1).optional(),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    TENANT_AUTH_TOKEN_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),
}).superRefine((env, context) => {
    if (!env.DATABASE_URL && (!env.DB_HOST || !env.DB_DATABASE || !env.DB_USER || !env.DB_PASSWORD)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["DATABASE_URL"],
            message: "Set DATABASE_URL or all of DB_HOST, DB_DATABASE, DB_USER, and DB_PASSWORD",
        });
    }
    if (env.DATABASE_URL) {
        try {
            const databaseUrl = new URL(env.DATABASE_URL);
            if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol) || !databaseUrl.hostname || databaseUrl.pathname.length < 2) {
                throw new Error("invalid PostgreSQL URL");
            }
        } catch {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["DATABASE_URL"],
                message: "DATABASE_URL must be a valid PostgreSQL connection URL",
            });
        }
    }
    if (env.NODE_ENV === "production" && !env.CORS_ORIGIN) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["CORS_ORIGIN"],
            message: "CORS_ORIGIN must be explicitly configured in production",
        });
    }
    if (env.NODE_ENV === "production" && env.DB_SSL !== "true") {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["DB_SSL"],
            message: "DB_SSL must be true in production",
        });
    }
    if (env.CORS_ORIGIN) {
        const origins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
        if (origins.some((origin) => origin === "*")) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["CORS_ORIGIN"],
                message: "Wildcard CORS origins are not allowed",
            });
        }
        for (const origin of origins) {
            try {
                const parsedOrigin = new URL(origin);
                if (!["http:", "https:"].includes(parsedOrigin.protocol) || parsedOrigin.origin !== origin) {
                    throw new Error("invalid origin");
                }
            } catch {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["CORS_ORIGIN"],
                    message: "Each CORS origin must be an exact http(s) origin",
                });
                break;
            }
        }
    }
});

function loadEnv(source = process.env) {
    const result = envSchema.safeParse(source);
    if (!result.success) {
        const problems = result.error.issues.map(({ path, message }) => `${path.join(".")}: ${message}`);
        throw new Error(`Invalid environment configuration: ${problems.join("; ")}`);
    }
    return { ...result.data, CORS_ORIGIN: result.data.CORS_ORIGIN || "http://localhost:5173" };
}

module.exports = { loadEnv };
