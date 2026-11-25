CREATE TABLE spends (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    amount_paise BIGINT NOT NULL CHECK (amount_paise BETWEEN 1 AND 9007199254740991),
    description VARCHAR(500) NOT NULL CHECK (btrim(description) <> ''),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    idempotency_key VARCHAR(128) NOT NULL,
    UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX spends_organization_id_id_idx ON spends (organization_id, id);
