ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);
ALTER TABLE deposit_transactions ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_unique
    ON payments (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS deposits_idempotency_key_unique
    ON deposit_transactions (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_reversals (
    id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    reason VARCHAR(255) NOT NULL CHECK (btrim(reason) <> ''),
    reversed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    idempotency_key VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_reversals_idempotency_key_unique
    ON payment_reversals (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_reversals_payment_id ON payment_reversals(payment_id);

CREATE TABLE IF NOT EXISTS stay_rate_plans (
    id BIGSERIAL PRIMARY KEY,
    stay_id BIGINT NOT NULL REFERENCES stays(id) ON DELETE RESTRICT,
    effective_from DATE NOT NULL,
    effective_to DATE,
    monthly_rent_paise BIGINT NOT NULL CHECK (monthly_rent_paise > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (effective_to IS NULL OR effective_to >= effective_from),
    UNIQUE (stay_id, effective_from)
);
CREATE UNIQUE INDEX IF NOT EXISTS stay_rate_plans_one_open_plan
    ON stay_rate_plans(stay_id) WHERE effective_to IS NULL;
CREATE INDEX IF NOT EXISTS stay_rate_plans_lookup
    ON stay_rate_plans(stay_id, effective_from DESC);
