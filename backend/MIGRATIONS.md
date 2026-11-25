# Database migrations

The database is changed only through ordered `migrations/*.up.sql` files. The runner
records a SHA-256 checksum in `schema_migrations`, executes each migration in its own
transaction, and refuses a changed migration that was already applied.

## Local development

1. Create an empty database and set `DATABASE_URL` in `backend/.env`.
2. Run `npm run migrate`.
3. Inspect state with `npm run migrate:status`.

For a database created using the old `organizationTables.sql`, take a backup, verify
that it matches the former baseline, then run `npm run migrate:baseline -- 001` and
`npm run migrate`. Do not run the old schema file again.

Migration `004` adds `stays.created_at` for older installations that lack it. Existing
stays receive the migration time as their creation timestamp because their original
creation times were not recorded.

Migration `005` adds the durable PostgreSQL job queue, worker heartbeats, and tenant
notification records. Deploy the API and the separate worker after this migration
has completed; do not move scheduled work into the API process.

## Deployment

Back up the database and verify restore capability. Run `npm ci`, then
`npm run migrate:status`, followed by `npm run migrate`, as a one-off release job
before deploying application instances that require the new schema. Set
`MIGRATION_DATABASE_URL` for the release job and `DATABASE_URL` for the API/worker.
Use a dedicated database principal with DDL rights only for migrations; API and worker
principals should not have schema-alter privileges.

## Rollback

Migrations are forward-only because dropping columns or constraints can destroy
financial history. If an application release fails, roll back the application first.
For an irreversible database failure, restore the verified pre-migration backup (or
use PostgreSQL point-in-time recovery), then deploy the prior compatible release.
Create a new corrective migration instead of editing an applied migration.

## Inventory deletion

Migration `007` enables permanent deletion down the property, floor, room, and bed
hierarchy, including previously archived descendants of the selected record. An
existing stay blocks deletion of its bed or an ancestor and the entire operation
rolls back. Tenants and organizations still use `archived_at`.
