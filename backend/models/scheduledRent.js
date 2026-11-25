function rentRateForMonth(month) {
    return `SELECT monthly_rent_paise FROM stay_rate_plans
            WHERE stay_id = s.id AND effective_from <= ${month}
              AND (effective_to IS NULL OR effective_to >= ${month})
            ORDER BY effective_from DESC LIMIT 1`;
}

async function ensureRentCycles(db, stayIds, throughDate = null) {
    // A legacy monthly charge covers the first cycle due in its calendar month.
    const result = await db.query(
        `INSERT INTO rent_dues (stay_id, due_month, amount_paise, due_date, status, billing_cycle)
         SELECT s.id, period.due_month, rate.monthly_rent_paise, period.due_date,
                CASE WHEN period.due_date < CURRENT_DATE THEN 'OVERDUE' ELSE 'DUE' END, cycle.number
         FROM stays s
         CROSS JOIN LATERAL generate_series(
             1, (LEAST(COALESCE($2::date, CURRENT_DATE), CURRENT_DATE) - s.move_in_date) / 30
         ) AS cycle(number)
         CROSS JOIN LATERAL (
             SELECT s.move_in_date + cycle.number * 30 AS due_date,
                    date_trunc('month', (s.move_in_date + cycle.number * 30)::timestamp)::date AS due_month
         ) period
         JOIN LATERAL (${rentRateForMonth("period.due_date - 30")}) rate ON TRUE
         WHERE s.id = ANY($1::bigint[]) AND s.move_out_date IS NULL AND rate.monthly_rent_paise > 0
           AND NOT EXISTS (
               SELECT 1 FROM rent_dues legacy
               WHERE legacy.stay_id = s.id AND legacy.due_month = period.due_month
                 AND legacy.billing_cycle IS NULL
                 AND (cycle.number = 1 OR period.due_date - 30 < period.due_month)
           )
         ON CONFLICT (stay_id, billing_cycle) WHERE billing_cycle IS NOT NULL DO NOTHING`,
        [stayIds, throughDate]
    );
    return result.rowCount;
}

async function generateRentCycles(pool, throughDate = null) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { rows } = await client.query(
            `SELECT s.id FROM stays s JOIN organizations o ON o.id = s.organization_id
             WHERE s.move_out_date IS NULL AND o.archived_at IS NULL
               AND s.move_in_date + 30 <= LEAST(COALESCE($1::date, CURRENT_DATE), CURRENT_DATE)
             ORDER BY s.id FOR NO KEY UPDATE OF s`,
            [throughDate]
        );
        const generated = rows.length ? await ensureRentCycles(client, rows.map(({ id }) => id), throughDate) : 0;
        await client.query("COMMIT");
        return { generated };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { ensureRentCycles, generateRentCycles, rentRateForMonth };
