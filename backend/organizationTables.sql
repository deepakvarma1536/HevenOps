-- ============================================
-- HevenOps Database Schema
-- ============================================


-- 1. Organizations
CREATE TABLE organizations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 2. Users
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 3. Organization Members
CREATE TABLE organization_members (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(30) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id)
        REFERENCES organizations(id),

    FOREIGN KEY (user_id)
        REFERENCES users(id),

    UNIQUE (organization_id, user_id)
);


-- 4. Properties (PGs)
CREATE TABLE properties (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
);


-- 5. Floors
CREATE TABLE floors (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (property_id)
        REFERENCES properties(id)
);


-- 6. Rooms
CREATE TABLE rooms (
    id BIGSERIAL PRIMARY KEY,
    floor_id BIGINT NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    room_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (floor_id)
        REFERENCES floors(id),

    UNIQUE (floor_id, room_number)
);


-- 7. Beds
CREATE TABLE beds (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT NOT NULL,
    bed_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'VACANT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (room_id)
        REFERENCES rooms(id),

    UNIQUE (room_id, bed_number)
);


-- 8. Tenants
CREATE TABLE tenants (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 9. Stays
CREATE TABLE stays (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    bed_id BIGINT NOT NULL,
    move_in_date DATE NOT NULL,
    move_out_date DATE,

    FOREIGN KEY (tenant_id)
        REFERENCES tenants(id),

    FOREIGN KEY (bed_id)
        REFERENCES beds(id)
);


-- 10. Rent Dues
CREATE TABLE rent_dues (
    id BIGSERIAL PRIMARY KEY,
    stay_id BIGINT NOT NULL,
    due_month DATE NOT NULL,
    amount_paise BIGINT NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DUE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (stay_id)
        REFERENCES stays(id),

    CHECK (amount_paise > 0),

    UNIQUE (stay_id, due_month)
);


-- 11. Payments
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    rent_due_id BIGINT NOT NULL,
    amount_paise BIGINT NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(30),
    reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (rent_due_id)
        REFERENCES rent_dues(id),

    CHECK (amount_paise > 0)
);


-- 12. Deposit Transactions
CREATE TABLE deposit_transactions (
    id BIGSERIAL PRIMARY KEY,
    stay_id BIGINT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    amount_paise BIGINT NOT NULL,
    transaction_date DATE NOT NULL,
    note VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (stay_id)
        REFERENCES stays(id),

    CHECK (amount_paise > 0)
);


-- ============================================
-- Additional Safety Rules
-- ============================================

-- A bed can have only one active stay.
CREATE UNIQUE INDEX stays_one_active_bed
ON stays (bed_id)
WHERE move_out_date IS NULL;
