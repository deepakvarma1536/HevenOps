CREATE TABLE background_jobs (
    id BIGSERIAL PRIMARY KEY,
    job_type VARCHAR(80) NOT NULL,
    idempotency_key VARCHAR(200) NOT NULL UNIQUE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'running', 'succeeded', 'dead')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
    run_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR(100),
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_background_jobs_ready
    ON background_jobs (run_at, id)
    WHERE status = 'queued';
CREATE INDEX idx_background_jobs_expired_lease
    ON background_jobs (locked_at, id)
    WHERE status = 'running';
CREATE INDEX idx_background_jobs_dead
    ON background_jobs (updated_at DESC)
    WHERE status = 'dead';

CREATE TABLE worker_heartbeats (
    worker_id VARCHAR(100) PRIMARY KEY,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tenant_notifications (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(160) NOT NULL,
    body TEXT NOT NULL,
    idempotency_key VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_notifications_tenant_created
    ON tenant_notifications (tenant_id, created_at DESC);
