# HevenOps API

## Run locally

1. Copy `.env.example` to `.env` and configure `DATABASE_URL` and a random `JWT_SECRET` with at least 32 characters. The migration runner requires an explicit `DATABASE_URL`.
2. Configure `CORS_ORIGIN` with the exact frontend origin(s), comma-separated if needed.
3. Run the database migrations, then start the API:

```sh
npm run migrate
npm start
```

`DATABASE_URL` takes precedence over the individual `DB_*` connection values. The pool is limited by `DB_POOL_MAX`, `DB_CONNECTION_TIMEOUT_MS`, and `DB_IDLE_TIMEOUT_MS`. Production requires `DB_SSL=true` and an explicit CORS allow-list.

## Operations

- `GET /health` reports process liveness without requiring PostgreSQL.
- `GET /ready` checks PostgreSQL and returns `503` with the standard API error envelope when the database is unavailable.
- `GET /openapi.json` serves the OpenAPI document; `GET /api-docs` serves Swagger UI.
- `SIGTERM` and `SIGINT` stop accepting connections, allow active requests to finish, and close the PostgreSQL pool.

The JSON body limit is 64 KiB. Authentication endpoints are rate-limited using `AUTH_RATE_LIMIT_WINDOW_MS` and `AUTH_RATE_LIMIT_MAX`. Request logs are structured JSON and omit request bodies, query strings, credentials, and authorization headers.

## API response contracts

List endpoints accept `page` (default `1`), `limit` (default `25`, maximum `100`), `sortBy` (endpoint-specific allow-list), and `sortOrder` (`asc` or `desc`). Supported endpoint filters are documented in Swagger. List responses have this shape:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 0,
    "totalPages": 0
  }
}
```

Errors use a consistent envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [],
    "requestId": "request-id"
  }
}
```

## Tests

Run the tests from `backend/`:

```sh
npm test
npm run test:unit
npm run test:coverage
TEST_DATABASE_URL='postgresql://<user>:<password>@localhost:5432/hevenops_test' npm run test:integration
TEST_DATABASE_URL='postgresql://<user>:<password>@localhost:5432/hevenops_test' npm run test:e2e
```

`npm test` runs all discovered tests; PostgreSQL suites are skipped when `TEST_DATABASE_URL` is unset. `test:unit` runs the DB-independent unit and HTTP-hardening tests. `test:coverage` reports coverage for environment validation, request schemas, pagination, validators, and validation/error middleware, and enforces minimums of 65% lines, 55% functions, and 45% branches.

PostgreSQL suites require `TEST_DATABASE_URL` to identify a **dedicated disposable database** whose name ends in `_test` or `_testdb` (and does not contain `prod`, `production`, `stage`, or `staging`). The test runner refuses missing, malformed, or non-test database URLs and never falls back to `DATABASE_URL` or `DB_*`. Give the test role permission to connect and create/drop schemas. Each suite creates a uniquely named schema, sets its pool search path to that schema, and drops only that schema when finished; it does not create/drop a database or modify the database's `public` schema.

`test:e2e` starts the Express app against the isolated schema and applies every backend migration there before making HTTP requests. It covers owner registration/login and organization creation, tenant creation/invitation/password setup/login, property hierarchy and stay assignment, rent-due generation/idempotency, payment/status updates, tenant portal access, permission enforcement, and cross-organization isolation. `test:integration` also runs the existing financial ledger and organization-scope model tests in a separate isolated schema. CI may provision one disposable PostgreSQL test database and run `npm run test:e2e`; migrations are applied by the suite in its private schema, so do not run the ordinary `npm run migrate` against a shared database for this step.
