const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadEnv } = require("../config/env");
const { listQuerySchema, paginateQuery } = require("../utils/pagination");
const { schemas } = require("../utils/requestSchemas");
const { isValidIsoDate, validateIdParam, validateIdempotencyKey } = require("../utils/validators");

test("ISO date and idempotency-key validators reject malformed values", () => {
    assert.equal(isValidIsoDate("2024-02-29"), true);
    assert.equal(isValidIsoDate("2025-02-29"), false);
    assert.equal(isValidIsoDate("2026-1-02"), false);
    assert.equal(validateIdempotencyKey("payment-key-123456"), true);
    assert.equal(validateIdempotencyKey("too-short"), false);
    assert.equal(validateIdempotencyKey("payment key invalid"), false);
});

test("ID validation responds with a client error for nonnumeric identifiers", () => {
    let errorResponse;
    const response = {
        status(statusCode) {
            errorResponse = { statusCode };
            return this;
        },
        json(body) {
            errorResponse.body = body;
        },
    };
    assert.equal(validateIdParam("abc", response, "tenantId"), false);
    assert.deepEqual(errorResponse, {
        statusCode: 400,
        body: { error: "Invalid parameter: tenantId must be a positive integer" },
    });
});

test("list query schema defaults, coerces values, and rejects unknown or unsafe fields", () => {
    const schema = listQuerySchema({ sortFields: ["id", "name"] });
    assert.deepEqual(schema.parse({}), { page: 1, limit: 25, sortBy: "id", sortOrder: "asc" });
    assert.deepEqual(schema.parse({ page: "2", limit: "10", sortBy: "name", sortOrder: "desc" }), {
        page: 2,
        limit: 10,
        sortBy: "name",
        sortOrder: "desc",
    });
    assert.equal(schema.safeParse({ sortBy: "id; DROP TABLE users" }).success, false);
    assert.equal(schema.safeParse({ limit: "101" }).success, false);
    assert.equal(schema.safeParse({ unexpected: "value" }).success, false);
});

test("pagination binds user data and derives order only from allow-listed columns", async () => {
    const calls = [];
    const fakePool = {
        async query(sql, values) {
            calls.push({ sql, values });
            return calls.length === 1
                ? { rows: [{ id: 3 }] }
                : { rows: [{ total: 21 }] };
        },
    };
    const result = await paginateQuery(fakePool, {
        select: "SELECT id",
        fromWhere: "FROM tenants WHERE organization_id = $1",
        values: [8],
        page: 3,
        limit: 10,
        sortBy: "name",
        sortOrder: "desc",
        sortColumns: { name: "tenant_name" },
        tieColumn: "id",
    });
    assert.deepEqual(result, {
        data: [{ id: 3 }],
        pagination: { page: 3, limit: 10, total: 21, totalPages: 3 },
    });
    assert.match(calls[0].sql, /ORDER BY tenant_name DESC, id ASC/);
    assert.deepEqual(calls[0].values, [8, 10, 20]);
    assert.deepEqual(calls[1].values, [8]);
    await assert.rejects(paginateQuery(fakePool, {
        select: "SELECT id",
        fromWhere: "FROM tenants",
        values: [],
        sortBy: "unknown",
        sortColumns: { name: "tenant_name" },
    }), { code: "INVALID_SORT" });
});

test("request schemas validate endpoint payloads and reject extra payment fields", () => {
    assert.equal(schemas.stayCreate.safeParse({
        params: {},
        query: {},
        headers: {},
        body: {
            tenantId: "1",
            bedId: 2,
            moveInDate: "2026-02-30",
            monthly_rent_paise: 1000,
        },
    }).success, false);
    assert.equal(schemas.stayCreate.safeParse({
        params: {},
        query: {},
        headers: {},
        body: {
            tenantId: "1",
            bedId: 2,
            moveInDate: "2026-02-28",
            monthly_rent_paise: 1000,
        },
    }).success, true);
    assert.equal(schemas.paymentCreate.safeParse({
        params: {},
        query: {},
        body: { rentDueId: 1, amount_paise: 1000, injected: true },
        headers: { "idempotency-key": "valid-idempotency-key" },
    }).success, false);
});

test("environment validation rejects missing secrets and unsafe production defaults", () => {
    assert.throws(() => loadEnv({ DATABASE_URL: "postgres://localhost/hevenops_test" }), /JWT_SECRET/);
    assert.throws(() => loadEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://localhost/hevenops_test",
        JWT_SECRET: "a".repeat(32),
    }), /CORS_ORIGIN.*DB_SSL|DB_SSL.*CORS_ORIGIN/);
    const valid = loadEnv({
        NODE_ENV: "test",
        DATABASE_URL: "postgres://localhost/hevenops_test",
        JWT_SECRET: "a".repeat(32),
    });
    assert.equal(valid.CORS_ORIGIN, "http://localhost:5173");
});
