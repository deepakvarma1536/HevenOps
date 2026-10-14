# HevenOps frontend

## API configuration

Copy `.env.example` to `.env` for local development. `VITE_API_BASE_URL` is the API
base URL used by the browser client. The default `/api` uses the Vite development
proxy, whose backend target is configured by `VITE_API_PROXY_TARGET`.

Staff and tenant requests use separate Axios clients and session keys. JWTs are kept in
tab-scoped `sessionStorage` to work with the backend bearer-token contract; they are not
written to `localStorage`. There is no refresh-token endpoint, so an expired or rejected
token clears only the matching session and returns that user to sign-in.

## Frontend quality checks

Component tests use Vitest, React Testing Library, and jsdom. Coverage is gated for the
actively tested component/hook/API-client slice: at least 65% statements, 55% branches,
60% functions, and 70% lines. Browser E2E tests use Playwright and Chromium.

```sh
npm run lint
npm run build
npm test
npm run test:coverage
npm exec -- playwright install chromium
npm run test:e2e
```

`npm run test:watch` starts Vitest in watch mode. `npm run test:e2e` starts the API and
Vite frontend; it does not provision or reset a database.

### Local and CI E2E prerequisites

> **Warning:** E2E creates persistent accounts and business records and does not clean
> them up. Run it only against a dedicated disposable E2E database. Never point the API
> at development, staging, production, or the backend integration-test database.
> Recreate/drop the E2E database after every run, including failed runs.

Create an isolated PostgreSQL database, set `DATABASE_URL` to that database, and run
migrations before E2E. Keep it separate from the backend integration suite, which uses
`TEST_DATABASE_URL` and recreates test tables.

```sh
dropdb --if-exists hevenops_e2e
createdb hevenops_e2e
export DATABASE_URL='postgresql://USER:PASSWORD@127.0.0.1:5432/hevenops_e2e'
export JWT_SECRET='replace-with-a-random-secret-at-least-32-characters'
export CORS_ORIGIN='http://127.0.0.1:5173'
npm run migrate --prefix backend
npm exec -- playwright install chromium
npm run test:e2e
dropdb hevenops_e2e
```

Run the E2E commands from `frontend/`; Playwright starts and stops both local servers.
Supply actual DB credentials from an untracked environment file or shell; never commit
them. The API needs `DATABASE_URL`, `JWT_SECRET` (at least 32 characters),
`CORS_ORIGIN`, and optionally `PORT` (defaults to 3000). Playwright defaults are
`PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173` and
`E2E_API_URL=http://127.0.0.1:3000/api`.

The E2E suite covers staff registration/login, tenant creation and invitation/password
setup, stay assignment, rent generation, payment, tenant login, and cross-organization
data/session isolation. Its credentials are generated for each run.
