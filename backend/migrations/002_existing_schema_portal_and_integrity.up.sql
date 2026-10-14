-- Upgrade databases created from the former organizationTables.sql baseline.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE floors ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE floors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE beds ADD COLUMN IF NOT EXISTS monthly_rent_paise BIGINT;
ALTER TABLE beds ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE beds ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS government_id VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE stays ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE rent_dues ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE beds DROP CONSTRAINT IF EXISTS beds_monthly_rent_paise_check;
ALTER TABLE beds ADD CONSTRAINT beds_monthly_rent_paise_check CHECK (monthly_rent_paise IS NULL OR monthly_rent_paise >= 0);
ALTER TABLE stays DROP CONSTRAINT IF EXISTS stays_dates_check;
ALTER TABLE stays ADD CONSTRAINT stays_dates_check CHECK (move_out_date IS NULL OR move_out_date >= move_in_date);

CREATE TABLE IF NOT EXISTS tenant_auth_tokens (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    token_hash CHAR(64) NOT NULL UNIQUE,
    purpose VARCHAR(30) NOT NULL CHECK (purpose IN ('INVITE', 'PASSWORD_RESET')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Financial history must not disappear through a cascading parent delete.
ALTER TABLE stays DROP CONSTRAINT IF EXISTS stays_tenant_id_fkey;
ALTER TABLE stays ADD CONSTRAINT stays_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
ALTER TABLE stays DROP CONSTRAINT IF EXISTS stays_bed_id_fkey;
ALTER TABLE stays ADD CONSTRAINT stays_bed_id_fkey FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE RESTRICT;
ALTER TABLE rent_dues DROP CONSTRAINT IF EXISTS rent_dues_stay_id_fkey;
ALTER TABLE rent_dues ADD CONSTRAINT rent_dues_stay_id_fkey FOREIGN KEY (stay_id) REFERENCES stays(id) ON DELETE RESTRICT;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_rent_due_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_rent_due_id_fkey FOREIGN KEY (rent_due_id) REFERENCES rent_dues(id) ON DELETE RESTRICT;
ALTER TABLE deposit_transactions DROP CONSTRAINT IF EXISTS deposit_transactions_stay_id_fkey;
ALTER TABLE deposit_transactions ADD CONSTRAINT deposit_transactions_stay_id_fkey FOREIGN KEY (stay_id) REFERENCES stays(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS stays_one_active_bed ON stays (bed_id) WHERE move_out_date IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS stays_one_active_tenant ON stays (tenant_id) WHERE move_out_date IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tenants_org_email_unique ON tenants (organization_id, lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_active_organization ON properties(organization_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_floors_active_property ON floors(property_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rooms_active_floor ON rooms(floor_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_beds_active_room ON beds(room_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_active_organization ON tenants(organization_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stays_organization_active ON stays(organization_id) WHERE move_out_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_rent_dues_stay_month ON rent_dues(stay_id, due_month DESC);
CREATE INDEX IF NOT EXISTS idx_payments_rent_due ON payments(rent_due_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_stay ON deposit_transactions(stay_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_auth_tokens_active ON tenant_auth_tokens(tenant_id, purpose, expires_at) WHERE used_at IS NULL;
