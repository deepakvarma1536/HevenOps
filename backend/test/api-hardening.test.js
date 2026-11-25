const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const jwt = require("jsonwebtoken");

process.env.DB_CONNECTION_TIMEOUT_MS = "100";
process.env.LOG_LEVEL = "silent";
process.env.JWT_SECRET = "test-secret-that-is-at-least-thirty-two-characters";
process.env.DATABASE_URL = "postgres://unused:unused@127.0.0.1:1/unused";

const { createApp } = require("../app");
const { loadEnv } = require("../config/env");
const { listQuerySchema } = require("../utils/pagination");

const env = loadEnv({
    NODE_ENV: "test",
    PORT: "3000",
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    AUTH_RATE_LIMIT_MAX: "100",
});
const app = createApp(env);
let server;
let baseUrl;
const ownerToken = jwt.sign({ userId: 1, organizationId: 1, role: "owner" }, env.JWT_SECRET);
const tenantToken = jwt.sign({ tenantId: 1, organizationId: 1 }, env.JWT_SECRET);

before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("liveness allows the local Vite origin without requiring the database", async () => {
    const origin = "http://127.0.0.1:5173";
    const response = await fetch(`${baseUrl}/health`, { headers: { Origin: origin } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
    assert.equal((await response.json()).status, "ok");
    assert.ok(response.headers.get("x-request-id"));
});

test("readiness returns the standard error format when the database is unavailable", async () => {
    const response = await fetch(`${baseUrl}/ready`);
    const payload = await response.json();
    assert.equal(response.status, 503);
    assert.equal(payload.error.code, "DATABASE_NOT_READY");
    assert.ok(payload.error.requestId);
});

test("login and signup report PostgreSQL authentication failures as service unavailability", async (t) => {
    const pool = require("../config/db");
    const databaseError = Object.assign(new Error("role does not exist"), { code: "28000" });
    t.mock.method(pool, "query", async () => { throw databaseError; });

    const credentials = { email: "owner@example.test", password: "test-password-123" };
    for (const [path, body] of [
        ["login", credentials],
        ["register", { ...credentials, name: "Test Owner", organizationName: "Test Org" }],
    ]) {
        const response = await fetch(`${baseUrl}/api/auth/${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const payload = await response.json();
        assert.equal(response.status, 503);
        assert.equal(payload.error.code, "DATABASE_NOT_READY");
        assert.equal(payload.error.requestId, response.headers.get("x-request-id"));
        assert.doesNotMatch(payload.error.message, /role does not exist/);
    }
});

test("session reads do not consume the authentication attempt limit", async (t) => {
    const limitedServer = createApp({ ...env, AUTH_RATE_LIMIT_MAX: 1 }).listen(0);
    t.after(() => new Promise((resolve) => limitedServer.close(resolve)));
    await new Promise((resolve) => limitedServer.once("listening", resolve));
    const authUrl = `http://127.0.0.1:${limitedServer.address().port}/api/auth`;

    for (let request = 0; request < 2; request++) {
        const response = await fetch(`${authUrl}/me`);
        assert.equal(response.status, 401);
    }

    const attempt = { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" };
    assert.equal((await fetch(`${authUrl}/login`, attempt)).status, 400);
    const blocked = await fetch(`${authUrl}/login`, attempt);
    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json()).error.code, "RATE_LIMITED");
});

test("worker readiness and metrics fail visibly when the database is unavailable", async () => {
    const readiness = await fetch(`${baseUrl}/ready/jobs`);
    const readinessPayload = await readiness.json();
    assert.equal(readiness.status, 503);
    assert.equal(readinessPayload.error.code, "WORKER_NOT_READY");

    const metrics = await fetch(`${baseUrl}/metrics`);
    assert.equal(metrics.status, 503);
    assert.match(await metrics.text(), /metrics temporarily unavailable/);
});

test("schema validation uses the standard API error format", async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Request-ID": "validation-test-1" },
        body: JSON.stringify({ email: "not-an-email", password: "short" }),
    });
    const payload = await response.json();
    assert.equal(response.status, 400);
    assert.equal(payload.error.code, "VALIDATION_ERROR");
    assert.equal(payload.error.requestId, "validation-test-1");
    assert.ok(Array.isArray(payload.error.details));
});

test("all write routes reject invalid payloads before business logic", async () => {
    const cases = [
        ["POST", "/api/auth/register", {}, false],
        ["POST", "/api/auth/login", {}, false],
        ["POST", "/api/tenant-auth/login", {}, false],
        ["POST", "/api/tenant-auth/setup-password", {}, false],
        ["PATCH", "/api/organizations/1", {}, true],
        ["DELETE", "/api/organizations/not-an-id", {}, true],
        ["POST", "/api/properties", {}, true],
        ["PATCH", "/api/properties/1", {}, true],
        ["DELETE", "/api/properties/not-an-id", {}, true],
        ["POST", "/api/floors", {}, true],
        ["PATCH", "/api/floors/1", {}, true],
        ["DELETE", "/api/floors/not-an-id", {}, true],
        ["POST", "/api/rooms", {}, true],
        ["PATCH", "/api/rooms/1", {}, true],
        ["DELETE", "/api/rooms/not-an-id", {}, true],
        ["POST", "/api/beds", {}, true],
        ["PATCH", "/api/beds/1/status", {}, true],
        ["DELETE", "/api/beds/not-an-id", {}, true],
        ["POST", "/api/tenants", {}, true],
        ["PATCH", "/api/tenants/1", {}, true],
        ["POST", "/api/tenants/1/invite", { purpose: "invalid" }, true],
        ["POST", "/api/tenants/1/auth-token", { purpose: "invalid" }, true],
        ["DELETE", "/api/tenants/not-an-id", {}, true],
        ["POST", "/api/stays", {}, true],
        ["PUT", "/api/stays/1", {}, true],
        ["PATCH", "/api/stays/1/checkout", { moveOutDate: "tomorrow" }, true],
        ["POST", "/api/stays/1/rate-plans", {}, true],
        ["POST", "/api/rent-dues", {}, true],
        ["POST", "/api/rent-dues/generate", {}, true],
        ["POST", "/api/payments", {}, true],
        ["POST", "/api/payments/1/reversals", {}, true],
        ["POST", "/api/deposits", {}, true],
        ["PUT", "/api/tenant-portal/me", {}, true, tenantToken],
    ];

    for (const [method, path, body, authenticated, token = ownerToken] of cases) {
        const headers = { "Content-Type": "application/json" };
        if (authenticated) headers.Authorization = `Bearer ${token}`;
        if (method === "POST" && (path === "/api/payments" || path.includes("/reversals") || path === "/api/deposits")) {
            headers["Idempotency-Key"] = "test-idempotency-key-01";
        }
        const response = await fetch(`${baseUrl}${path}`, {
            method,
            headers,
            body: JSON.stringify(body),
        });
        const payload = await response.json();
        assert.equal(response.status, 400, `${method} ${path} should fail validation`);
        assert.equal(payload.error.code, "VALIDATION_ERROR", `${method} ${path} should use standard API errors`);
    }
});

test("malformed JSON and unknown routes return standardized errors", async () => {
    const malformed = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"email":',
    });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).error.code, "INVALID_JSON");

    const unknown = await fetch(`${baseUrl}/not-a-route`);
    assert.equal(unknown.status, 404);
    assert.equal((await unknown.json()).error.code, "NOT_FOUND");
});

test("list query schema rejects injection-like sort keys and caps page size", () => {
    const schema = listQuerySchema({ sortFields: ["id", "name"] });
    assert.equal(schema.safeParse({ sortBy: "id; DROP TABLE users" }).success, false);
    assert.equal(schema.safeParse({ limit: "101" }).success, false);
    assert.deepEqual(schema.parse({ page: "2", limit: "10", sortBy: "name" }), {
        page: 2,
        limit: 10,
        sortBy: "name",
        sortOrder: "asc",
    });
});

test("oversized JSON bodies return the standardized payload error", async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: "x".repeat(70 * 1024) }),
    });
    assert.equal(response.status, 413);
    assert.equal((await response.json()).error.code, "PAYLOAD_TOO_LARGE");
});

test("environment validation requires TLS and explicit CORS in production", () => {
    assert.throws(() => loadEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://user:pass@localhost/db",
        JWT_SECRET: "a".repeat(32),
    }), /CORS_ORIGIN.*DB_SSL|DB_SSL.*CORS_ORIGIN/);
});

test("environment validation rejects wildcard and non-origin CORS values", () => {
    const baseConfig = {
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
    };
    assert.throws(() => loadEnv({ ...baseConfig, CORS_ORIGIN: "*" }), /CORS_ORIGIN/);
    assert.throws(() => loadEnv({ ...baseConfig, CORS_ORIGIN: "https://example.com/path" }), /CORS_ORIGIN/);
    assert.throws(() => loadEnv({
        DATABASE_URL: "https://example.com/not-postgres",
        JWT_SECRET: process.env.JWT_SECRET,
    }), /DATABASE_URL/);
});

test("an empty optional error-tracking webhook is treated as unset", () => {
    const config = loadEnv({
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        ERROR_TRACKING_WEBHOOK_URL: "",
    });
    assert.equal(config.ERROR_TRACKING_WEBHOOK_URL, undefined);
});
