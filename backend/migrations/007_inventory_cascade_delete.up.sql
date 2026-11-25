ALTER TABLE floors
    DROP CONSTRAINT floors_property_id_fkey,
    ADD CONSTRAINT floors_property_id_fkey
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;

ALTER TABLE rooms
    DROP CONSTRAINT rooms_floor_id_fkey,
    ADD CONSTRAINT rooms_floor_id_fkey
        FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE;

ALTER TABLE beds
    DROP CONSTRAINT beds_room_id_fkey,
    ADD CONSTRAINT beds_room_id_fkey
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_stays_bed ON stays (bed_id);
