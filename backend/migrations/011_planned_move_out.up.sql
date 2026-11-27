ALTER TABLE stays
    ADD COLUMN planned_move_out_date DATE,
    ADD CONSTRAINT stays_planned_move_out_check CHECK (
        planned_move_out_date IS NULL OR (
            move_out_date IS NULL AND planned_move_out_date >= move_in_date
        )
    );
