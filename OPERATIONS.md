# Operations runbook

HevenOps stays a modular monolith: API and background worker are separate processes
from the same backend image, share one PostgreSQL database, and have no service-to-
service business API. The PostgreSQL job table is the durable queue. PostgreSQL is
the system of record; the queue and notification records are migrated with the
application schema.

## Deployment and health

Use the per-environment template as a checklist, not as a source of live secrets:

- `.env.development.example` for a production-shaped local Compose stack.
- `.env.staging.example` for a dedicated staging environment.
- `.env.production.example` for production settings.

Inject passwords, JWT signing keys, database URLs (URL-encode credentials), and
error-tracking webhook URLs from the environment's secret manager. Never commit
filled-in environment files. Production
requires an exact HTTPS `CORS_ORIGIN`, PostgreSQL TLS (`DB_SSL=true`), and a
32-character-or-longer `JWT_SECRET`. Use separate database roles: the migration
principal needs DDL permissions; API and worker principals should have only the
application DML permissions they require.

Build and validate the release before rollout:

```sh
docker compose config --quiet
docker compose build
docker compose run --rm migrate
docker compose up -d --no-deps api worker frontend
docker compose ps
```

Run the migration task once per release, before deploying application containers.
The transactional migration runner records checksums and refuses edited migrations.
Monitor:

- `GET /health`: API process liveness; it does not require PostgreSQL.
- `GET /ready`: API database readiness.
- `GET /ready/jobs`: database and recent worker-heartbeat readiness.
- Worker `/health` and `/ready` on internal port 9100.
- `/metrics` on the API and internal worker port 9100 for Prometheus-format request,
  process, and job-state metrics.

Only the frontend port should be internet-facing. Keep API and worker metrics ports
on private networks and scrape them from the monitoring network. Alert on API/worker
unready states, queued job age, dead-letter count above zero, database connection
failures, and sustained 5xx/request-rate changes. Configure
`ERROR_TRACKING_WEBHOOK_URL` to send sanitized exception names/codes and correlation
IDs to an HTTPS-compatible incident intake; request bodies, credentials, and stack
traces are not sent.

## Scheduled work and queue operations

The worker checks rent cycles, overdue balances, and reminders once per database
calendar day. Rent accrues every 30 days from move-in. The first due date is 30 days
after move-in, and a restarted worker fills in completed cycles for active stays.
Reminders are persisted as tenant notification records; this repository does not
configure an email/SMS provider. Queue jobs use unique idempotency keys, row-locked
claims, leases, capped exponential retries, and a `dead` state. Reprocessing generation,
overdue, and reminder side effects is safe by business-key constraints.

Inspect queue state during an incident:

```sql
SELECT status, COUNT(*) FROM background_jobs GROUP BY status ORDER BY status;
SELECT id, job_type, idempotency_key, attempts, max_attempts, last_error, updated_at
FROM background_jobs
WHERE status = 'dead'
ORDER BY updated_at DESC;
SELECT worker_id, last_seen_at FROM worker_heartbeats ORDER BY last_seen_at DESC;
```

After resolving the underlying cause and verifying the job is safe to replay, requeue
one dead job explicitly:

```sql
UPDATE background_jobs
SET status = 'queued', attempts = 0, run_at = CURRENT_TIMESTAMP,
    locked_at = NULL, locked_by = NULL, last_error = NULL,
    completed_at = NULL, updated_at = CURRENT_TIMESTAMP
WHERE id = :job_id AND status = 'dead';
```

Confirm exactly one row was updated and monitor its final status. Do not bulk requeue
unknown jobs. Preserve queue rows and notification history for incident analysis.

## Backups and restore drills

Use managed PostgreSQL automated backups and point-in-time recovery where available.
For an additional logical backup, use a protected host and a secure credential source:

```sh
pg_dump --format=custom --no-owner --file="hevenops-$(date -u +%Y%m%dT%H%M%SZ).dump" "$DATABASE_URL"
pg_restore --list hevenops-YYYYMMDDTHHMMSSZ.dump
```

Encrypt and transfer the dump to approved backup storage; enforce retention and access
logging there. Never write production backups to the repository or an unencrypted
shared directory.

At least quarterly, restore to a new isolated database (never over the live database),
apply the expected access controls, and verify:

```sh
pg_restore --no-owner --dbname "$RESTORE_DATABASE_URL" hevenops-backup.dump
DATABASE_URL="$RESTORE_DATABASE_URL" npm run migrate:status --prefix backend
```

Run smoke queries for organizations, stays, rent dues, payments, tenant notifications,
and `schema_migrations`; record restore duration and the verified recovery point.
Do not make a restore incident's target database publicly reachable.

## Migration and rollback

Before a release, confirm the backup/restore health, review pending migration SQL,
then run `npm run migrate:status` and `npm run migrate` against the intended database.
For managed hosting, run migrations as a one-off release job with `MIGRATION_DATABASE_URL`; the API and
worker use the least-privilege `DATABASE_URL`. Do not grant DDL permissions to the
API or worker roles.

Migrations are forward-only. Never edit an applied migration or automatically run a
destructive down migration. If application rollout fails:

1. Stop the rollout and retain logs, request IDs, job IDs, and database metrics.
2. Roll API and worker images back together to the last compatible release.
3. Keep additive schema changes in place when the previous release remains compatible.
4. For data/schema corruption, restore a verified backup or use point-in-time recovery
   into a controlled target, validate it, and coordinate cutover.
5. Correct schema issues with a new forward migration after a tested recovery plan.

## Incident response

1. Acknowledge the alert and identify affected services/time window.
2. Check `/health`, `/ready`, `/ready/jobs`, worker readiness, PostgreSQL health, and
   queue state. Correlate logs with `X-Request-ID`, job ID, and worker ID.
3. If the worker is unhealthy, preserve queued/running jobs and inspect heartbeat and
   dead-letter rows before restarting it. Lease expiry recovers abandoned work.
4. If the database is unhealthy, avoid application retries that could worsen overload;
   protect the latest backup/PITR recovery point and involve the database operator.
5. If erroneous rent/reminder processing occurred, preserve job and notification rows,
   reconcile affected rent dues/payments, and use a reviewed corrective migration or
   application fix. Do not delete financial history to clear an alert.
6. Record impact, root cause, recovery steps, and follow-up actions. Rotate any
   credential that may have been exposed and verify it is absent from logs.

## Limitations and ownership

The generic error-tracking webhook is optional and must be connected to an approved
HTTPS intake. Tenant reminders are durable in-app notification records only; delivery
through email, SMS, or push requires a provider, credentials, consent/opt-out policy,
and delivery-status/retry contract, which are intentionally not fabricated here.
