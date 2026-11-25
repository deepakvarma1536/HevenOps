# Developer quality checks

Run the following checks before opening a pull request. Use Node.js 22 and PostgreSQL.
The database names below are disposable test databases; do not point them at local
development or production data.

## One-time local setup

```sh
createdb hevenops_test
createdb hevenops_e2e
```

Set a connection URL for each test database in your shell or an untracked environment
file. Do not commit credentials. `TEST_DATABASE_URL` must use a database ending in
`_test` or `_testdb`; the integration harness creates an isolated schema inside it.
E2E writes data to its database, which should be disposable.

```sh
export TEST_DATABASE_URL='postgresql://USER:PASSWORD@localhost:5432/hevenops_test'
export DATABASE_URL='postgresql://USER:PASSWORD@localhost:5432/hevenops_e2e'
export JWT_SECRET='replace-with-a-random-secret-at-least-32-characters'
export NODE_ENV=test
export CORS_ORIGIN='http://127.0.0.1:5173'
export LOG_LEVEL=silent
export PORT=3000
export E2E_API_URL='http://127.0.0.1:3000/api'
export PLAYWRIGHT_BASE_URL='http://127.0.0.1:5173'
```

The backend also provides [`.env.example`](./backend/.env.example) for ordinary local
development. The frontend provides [`.env.example`](./frontend/.env.example). Copy
examples to untracked `.env` files and replace all placeholder values before use.
The backend validates required configuration at startup.

## Exact pre-PR commands

From the repository root:

```sh
npm ci --prefix backend
npm ci --prefix frontend
npm run env:check --prefix backend
npm run lint --prefix backend
npm run lint --prefix frontend
npm run test:coverage --prefix backend
npm run test:integration --prefix backend
npm run test:coverage --prefix frontend
npm run build --prefix frontend
npm run migrate:status --prefix backend
npm run migrate --prefix backend
npm run migrate:status --prefix backend
npm audit --prefix backend --audit-level=high
npm audit --prefix frontend --audit-level=high
npx --prefix frontend playwright install chromium
npm run test:e2e --prefix frontend
```

The E2E Playwright configuration starts the API and Vite servers itself. Before
running it, ensure `DATABASE_URL` points only to the disposable `hevenops_e2e` database
and apply the migrations as shown above. E2E covers registration/login, tenant creation
and invitation/password setup, stay assignment, rent generation, payment, and
cross-organization access/session isolation. It creates records that remain in the E2E
database; recreate that disposable database when you want a clean run.

The GitHub Actions quality workflow runs the same checks with separate PostgreSQL
databases for backend integration tests and browser E2E, and uses CI-only credentials.

## Production-shaped local stack

Install Docker Compose, copy `.env.development.example` to `.env`, replace the
development-only database password and JWT secret, then run:

```sh
docker compose config --quiet
docker compose up --build -d
docker compose ps
curl --fail http://localhost:8080/health
curl --fail http://localhost:8080/ready
docker compose logs --tail=100 api worker
```

Compose runs a PostgreSQL migration one-shot before starting the API and worker,
persists local database data in the `postgres_data` volume, and serves the UI through
an unprivileged Nginx container. The worker is a separate service. For staging, use
`.env.staging.example` with a dedicated TLS-enabled staging database and inject all
credential values using the staging secret manager. The production template is
`.env.production.example`; production should use managed PostgreSQL, backups, TLS
termination, and a secret manager rather than the Compose development database.
See [OPERATIONS.md](./OPERATIONS.md) for deployment and recovery procedures.
