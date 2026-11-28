CREATE TABLE apartments (
    id BIGSERIAL PRIMARY KEY,
    floor_id BIGINT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL CHECK (btrim(name) <> ''),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (floor_id, id)
);

CREATE UNIQUE INDEX apartments_floor_name_key ON apartments (floor_id, lower(btrim(name)));

ALTER TABLE rooms ADD COLUMN apartment_id BIGINT;
ALTER TABLE rooms ADD CONSTRAINT rooms_apartment_floor_fkey
    FOREIGN KEY (floor_id, apartment_id) REFERENCES apartments(floor_id, id) ON DELETE CASCADE;
CREATE INDEX rooms_apartment_idx ON rooms (floor_id, apartment_id) WHERE apartment_id IS NOT NULL;
