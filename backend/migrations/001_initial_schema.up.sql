CREATE TABLE organizations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL CHECK (btrim(name) <> ''),
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL CHECK (btrim(name) <> ''),
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE organization_members (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    role VARCHAR(30) NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, user_id)
);

CREATE TABLE properties (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL CHECK (btrim(name) <> ''),
    address TEXT,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, name)
);

CREATE TABLE floors (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    name VARCHAR(50) NOT NULL CHECK (btrim(name) <> ''),
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (property_id, name)
);

CREATE TABLE rooms (
    id BIGSERIAL PRIMARY KEY,
    floor_id BIGINT NOT NULL REFERENCES floors(id) ON DELETE RESTRICT,
    room_number VARCHAR(20) NOT NULL CHECK (btrim(room_number) <> ''),
    room_type VARCHAR(50),
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (floor_id, room_number)
);

CREATE TABLE beds (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    bed_number VARCHAR(20) NOT NULL CHECK (btrim(bed_number) <> ''),
    monthly_rent_paise BIGINT CHECK (monthly_rent_paise IS NULL OR monthly_rent_paise >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'VACANT' CHECK (status IN ('VACANT', 'OCCUPIED', 'MAINTENANCE')),
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (room_id, bed_number)
);

CREATE TABLE tenants (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL CHECK (btrim(name) <> ''),
    phone VARCHAR(20) NOT NULL CHECK (btrim(phone) <> ''),
    email VARCHAR(150),
    password_hash TEXT,
    government_id VARCHAR(100),
    emergency_contact VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, phone)
);

CREATE TABLE stays (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    bed_id BIGINT NOT NULL REFERENCES beds(id) ON DELETE RESTRICT,
    move_in_date DATE NOT NULL,
    move_out_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (move_out_date IS NULL OR move_out_date >= move_in_date)
);

CREATE TABLE rent_dues (
    id BIGSERIAL PRIMARY KEY,
    stay_id BIGINT NOT NULL REFERENCES stays(id) ON DELETE RESTRICT,
    due_month DATE NOT NULL CHECK (due_month = date_trunc('month', due_month::timestamp)::date),
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DUE' CHECK (status IN ('DUE', 'PARTIALLY_PAID', 'PAID', 'OVERDUE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (stay_id, due_month)
);

CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    rent_due_id BIGINT NOT NULL REFERENCES rent_dues(id) ON DELETE RESTRICT,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(30),
    reference VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deposit_transactions (
    id BIGSERIAL PRIMARY KEY,
    stay_id BIGINT NOT NULL REFERENCES stays(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('COLLECT', 'REFUND')),
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    transaction_date DATE NOT NULL,
    note VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tenant_auth_tokens (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    token_hash CHAR(64) NOT NULL UNIQUE,
    purpose VARCHAR(30) NOT NULL CHECK (purpose IN ('INVITE', 'PASSWORD_RESET')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX stays_one_active_bed ON stays (bed_id) WHERE move_out_date IS NULL;
CREATE UNIQUE INDEX stays_one_active_tenant ON stays (tenant_id) WHERE move_out_date IS NULL;
CREATE UNIQUE INDEX tenants_org_email_unique ON tenants (organization_id, lower(email)) WHERE email IS NOT NULL;
CREATE INDEX idx_properties_active_organization ON properties(organization_id) WHERE archived_at IS NULL;
CREATE INDEX idx_floors_active_property ON floors(property_id) WHERE archived_at IS NULL;
CREATE INDEX idx_rooms_active_floor ON rooms(floor_id) WHERE archived_at IS NULL;
CREATE INDEX idx_beds_active_room ON beds(room_id) WHERE archived_at IS NULL;
CREATE INDEX idx_tenants_active_organization ON tenants(organization_id) WHERE archived_at IS NULL;
CREATE INDEX idx_stays_organization_active ON stays(organization_id) WHERE move_out_date IS NULL;
CREATE INDEX idx_rent_dues_stay_month ON rent_dues(stay_id, due_month DESC);
CREATE INDEX idx_payments_rent_due ON payments(rent_due_id, payment_date DESC);
CREATE INDEX idx_deposits_stay ON deposit_transactions(stay_id, transaction_date DESC);
CREATE INDEX idx_tenant_auth_tokens_active ON tenant_auth_tokens(tenant_id, purpose, expires_at) WHERE used_at IS NULL;
