ALTER TABLE rent_dues
    ADD COLUMN billing_cycle INTEGER CHECK (billing_cycle > 0),
    DROP CONSTRAINT rent_dues_stay_id_due_month_key;

CREATE UNIQUE INDEX rent_dues_stay_manual_month_unique
    ON rent_dues (stay_id, due_month) WHERE billing_cycle IS NULL;

CREATE UNIQUE INDEX rent_dues_stay_billing_cycle_unique
    ON rent_dues (stay_id, billing_cycle) WHERE billing_cycle IS NOT NULL;
