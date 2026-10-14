const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { createIsolatedTestDatabase } = require('../test-support/isolated-test-db');

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const shouldSkip = !testDatabaseUrl;
let pool;
let isolatedDatabase;
let RentDueModel;
let PaymentModel;
let DepositModel;
let StayModel;

before(async () => {
    if (shouldSkip) return;
    isolatedDatabase = await createIsolatedTestDatabase();
    process.env.DATABASE_URL = isolatedDatabase.databaseUrl;
    pool = isolatedDatabase.pool;
    RentDueModel = require('../models/rentDueModel');
    PaymentModel = require('../models/paymentModel');
    DepositModel = require('../models/depositModel');
    StayModel = require('../models/stayModel');

    await pool.query(`
        DROP TABLE IF EXISTS payment_reversals, payments, deposit_transactions, rent_dues, stays, beds, organizations CASCADE;
        CREATE TABLE organizations (id BIGINT PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE stays (
            id BIGINT PRIMARY KEY,
            organization_id BIGINT NOT NULL REFERENCES organizations(id),
            bed_id BIGINT,
            move_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
            move_out_date DATE
        );
        CREATE TABLE beds (
            id BIGINT PRIMARY KEY,
            status VARCHAR(20) NOT NULL DEFAULT 'OCCUPIED'
        );
        CREATE TABLE rent_dues (
            id BIGINT PRIMARY KEY,
            stay_id BIGINT NOT NULL REFERENCES stays(id),
            due_month DATE NOT NULL,
            amount_paise BIGINT NOT NULL,
            due_date DATE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'DUE',
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE payments (
            id BIGSERIAL PRIMARY KEY,
            rent_due_id BIGINT NOT NULL REFERENCES rent_dues(id),
            amount_paise BIGINT NOT NULL,
            payment_date DATE NOT NULL,
            payment_method VARCHAR(30),
            reference VARCHAR(100),
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            idempotency_key VARCHAR(128)
        );
        CREATE UNIQUE INDEX payments_idempotency_key_unique ON payments (idempotency_key) WHERE idempotency_key IS NOT NULL;
        CREATE TABLE payment_reversals (
            id BIGSERIAL PRIMARY KEY, payment_id BIGINT NOT NULL REFERENCES payments(id),
            amount_paise BIGINT NOT NULL, reason TEXT NOT NULL, idempotency_key VARCHAR(128)
        );
        CREATE UNIQUE INDEX payment_reversals_idempotency_key_unique ON payment_reversals (idempotency_key) WHERE idempotency_key IS NOT NULL;
        CREATE TABLE deposit_transactions (
            id BIGSERIAL PRIMARY KEY, stay_id BIGINT NOT NULL REFERENCES stays(id),
            transaction_type VARCHAR(20) NOT NULL, amount_paise BIGINT NOT NULL,
            transaction_date DATE NOT NULL, note TEXT, idempotency_key VARCHAR(128)
        );
        CREATE UNIQUE INDEX deposits_idempotency_key_unique ON deposit_transactions (idempotency_key) WHERE idempotency_key IS NOT NULL;
        INSERT INTO organizations (id, name) VALUES (1, 'Org A'), (2, 'Org B');
        INSERT INTO beds (id) VALUES (1), (2);
        INSERT INTO stays (id, organization_id, bed_id, move_in_date) VALUES (10, 1, 1, '2026-01-01'), (20, 2, 2, '2026-01-01');
        INSERT INTO rent_dues (id, stay_id, due_month, amount_paise, due_date)
            VALUES (100, 10, '2026-01-01', 10000, '2026-01-05'),
                   (200, 20, '2026-01-01', 20000, '2026-01-05');
    `);
});

test('idempotency, partial payments, concurrency and reversals preserve the ledger', { skip: shouldSkip }, async () => {
    const first = await PaymentModel.processPayment(100, 1, 4000, 'CASH', null, 'payment-partial-key-0001');
    assert.equal(first.wasCreated, true);
    const duplicate = await PaymentModel.processPayment(100, 1, 4000, 'CASH', null, 'payment-partial-key-0001');
    assert.equal(duplicate.wasCreated, false);
    const second = await PaymentModel.processPayment(100, 1, 6000, 'CASH', null, 'payment-final-key-000002');
    assert.equal(second.wasCreated, true);
    await assert.rejects(PaymentModel.processPayment(100, 1, 1, 'CASH', null, 'payment-over-key-000003'), /OVERPAYMENT/);
    const reversal = await PaymentModel.reversePayment(second.payment.id, 1, 6000, 'receipt voided', 'reversal-key-00000001');
    assert.equal(reversal.wasCreated, true);
    await assert.rejects(PaymentModel.reversePayment(second.payment.id, 1, 1, 'duplicate void', 'reversal-key-00000002'), /OVERREVERSAL/);
    const due = await pool.query('SELECT status FROM rent_dues WHERE id = 100');
    assert.equal(due.rows[0].status, 'PARTIALLY_PAID');

    await pool.query(`INSERT INTO rent_dues (id, stay_id, due_month, amount_paise, due_date)
                      VALUES (300, 10, '2026-02-01', 10000, '2026-02-05')`);
    const simultaneous = await Promise.allSettled([
        PaymentModel.processPayment(300, 1, 6000, 'CASH', null, 'concurrent-payment-key-1'),
        PaymentModel.processPayment(300, 1, 6000, 'CASH', null, 'concurrent-payment-key-2')
    ]);
    assert.equal(simultaneous.filter((result) => result.status === 'fulfilled').length, 1);
});

test('deposit refunds are idempotent and cannot exceed collected value', { skip: shouldSkip }, async () => {
    await DepositModel.create(10, 1, 'COLLECT', 5000, '2026-01-01', null, 'deposit-collect-key-01');
    const refund = await DepositModel.create(10, 1, 'REFUND', 3000, '2026-01-02', null, 'deposit-refund-key-0001');
    assert.equal(refund.wasCreated, true);
    const duplicate = await DepositModel.create(10, 1, 'REFUND', 3000, '2026-01-02', null, 'deposit-refund-key-0001');
    assert.equal(duplicate.wasCreated, false);
    await assert.rejects(DepositModel.create(10, 1, 'REFUND', 2001, '2026-01-02', null, 'deposit-refund-key-0002'), /INSUFFICIENT_BALANCE/);
});

test('checkout cannot precede the move-in date', { skip: shouldSkip }, async () => {
    await assert.rejects(StayModel.checkout(10, 1, '2025-12-31'), /MOVE_OUT_BEFORE_MOVE_IN/);
});

after(async () => {
    if (shouldSkip) return;
    if (isolatedDatabase) await isolatedDatabase.close();
});

test('rent due reads do not expose another organization', { skip: shouldSkip }, async () => {
    assert.deepEqual((await RentDueModel.getByStay(20, 1)).data, []);
    assert.equal(await RentDueModel.getSummary(200, 1), undefined);
});

test('payments cannot be read or created for another organization', { skip: shouldSkip }, async () => {
    assert.deepEqual((await PaymentModel.getByRentDue(200, 1)).data, []);
    await assert.rejects(
        PaymentModel.processPayment(200, 1, 5000, 'CASH', 'cross-org-attempt'),
        { message: 'NOT_FOUND' }
    );

    const result = await pool.query('SELECT count(*)::int AS count FROM payments WHERE rent_due_id = 200');
    assert.equal(result.rows[0].count, 0);
});
