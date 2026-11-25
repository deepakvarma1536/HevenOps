function netPaidFor(dueId) {
    return `COALESCE((SELECT SUM(p.amount_paise) FROM payments p WHERE p.rent_due_id = ${dueId}), 0) -
        COALESCE((SELECT SUM(pr.amount_paise)
                  FROM payment_reversals pr
                  JOIN payments reversed_payment ON reversed_payment.id = pr.payment_id
                  WHERE reversed_payment.rent_due_id = ${dueId}), 0)`;
}

const rentDueBalanceJoin = `CROSS JOIN LATERAL (SELECT ${netPaidFor("rd.id")} AS net_paid) balance`;

const rentDueStatus = `CASE
    WHEN balance.net_paid >= rd.amount_paise THEN 'PAID'
    WHEN rd.due_date < CURRENT_DATE THEN 'OVERDUE'
    WHEN balance.net_paid > 0 THEN 'PARTIALLY_PAID'
    ELSE 'DUE'
END`;

module.exports = { netPaidFor, rentDueBalanceJoin, rentDueStatus };
