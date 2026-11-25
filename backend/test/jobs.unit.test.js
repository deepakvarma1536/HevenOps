const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
    enqueueJob,
    claimJob,
    completeJob,
    extendJobLease,
    failJob,
    deadLetterExpiredJobs,
    getJobCounts,
} = require("../jobs/jobQueue");
const { scheduleJobs } = require("../jobs/scheduler");
const { createJobHandlers, executeJob } = require("../jobs/handlers");

function fakeDb(queryResult) {
    const calls = [];
    return {
        calls,
        async query(sql, values) {
            calls.push({ sql, values });
            return typeof queryResult === "function" ? queryResult(sql, values) : queryResult;
        },
    };
}

test("scheduler enqueues daily jobs with stable idempotency keys", async () => {
    const calls = [];
    const queued = await scheduleJobs("2026-02-28", { reminderLeadDays: 4, maxAttempts: 7 }, async (...args) => {
        calls.push(args);
        return { id: calls.length };
    });

    assert.equal(queued.length, 3);
    assert.equal(calls[0][0], "generate-rent");
    assert.equal(calls[0][1], "rent-cycles:2026-02-28");
    assert.deepEqual(calls[0][2], { runDate: "2026-02-28" });
    assert.equal(calls[1][1], "mark-overdue:2026-02-28");
    assert.deepEqual(calls[2][2], { runDate: "2026-02-28", leadDays: 4 });
    assert.equal(calls[0][3].maxAttempts, 7);
});

test("job enqueue uses the unique idempotency key and reports duplicate jobs", async () => {
    const db = fakeDb({ rows: [] });
    const result = await enqueueJob("mark-overdue", "mark-overdue:2026-02-28", {}, {}, db);
    assert.equal(result, null);
    assert.match(db.calls[0].sql, /ON CONFLICT \(idempotency_key\) DO NOTHING/);
    assert.deepEqual(db.calls[0].values.slice(0, 4), ["mark-overdue", "mark-overdue:2026-02-28", "{}", 5]);
});

test("job enqueue returns the newly inserted job and job metrics return zero-safe counts", async () => {
    const inserted = { id: "3", status: "queued" };
    const db = fakeDb({ rows: [inserted] });
    assert.deepEqual(await enqueueJob("mark-overdue", "mark-overdue:2026-02-28", {}, {}, db), inserted);

    db.query = async () => ({ rows: [
        { status: "queued", count: "2" },
        { status: "dead", count: "1" },
    ] });
    assert.deepEqual(await getJobCounts(db), { queued: 2, dead: 1 });
});

test("the scheduler does not claim jobs already inserted for an idempotency key", async () => {
    const queued = await scheduleJobs("2026-02-28", {}, async () => null);
    assert.deepEqual(queued, []);
});

test("claiming jobs uses row-level locking and can reclaim expired worker leases", async () => {
    const job = { id: 4, job_type: "mark-overdue", attempts: 1 };
    const db = fakeDb({ rows: [job] });
    assert.deepEqual(await claimJob("worker-1", 30000, db), job);
    assert.match(db.calls[0].sql, /FOR UPDATE SKIP LOCKED/);
    assert.match(db.calls[0].sql, /status = 'running'.*locked_at/s);
    assert.deepEqual(db.calls[0].values, ["worker-1", 30000]);
});

test("job completion and lease renewal require the current worker lock", async () => {
    const db = fakeDb({ rowCount: 1 });
    await completeJob(12, "worker-1", db);
    assert.match(db.calls[0].sql, /locked_by = \$2/);
    assert.deepEqual(db.calls[0].values, [12, "worker-1"]);

    assert.equal(await extendJobLease(12, "worker-1", 60000, db), true);
    assert.match(db.calls[1].sql, /status = 'running' AND locked_by = \$2/);
    assert.deepEqual(db.calls[1].values, [12, "worker-1"]);
});

test("failed jobs receive exponential retry delay and final failures become dead letters", async () => {
    const db = fakeDb({ rows: [] });
    const retry = await failJob({ id: 1, attempts: 2, max_attempts: 4 }, "worker-1", {
        name: "DatabaseError",
        code: "08006",
        message: "password=must-not-be-stored",
    }, 500, db);
    assert.deepEqual(retry, { dead: false, retryDelayMs: 1000 });
    assert.equal(db.calls[0].values[2], "queued");
    assert.equal(db.calls[0].values[4], "DatabaseError:08006");
    assert.doesNotMatch(db.calls[0].values[4], /password/);

    const final = await failJob({ id: 2, attempts: 4, max_attempts: 4 }, "worker-1", new Error("failure"), 500, db);
    assert.deepEqual(final, { dead: true, retryDelayMs: 4000 });
    assert.equal(db.calls[1].values[2], "dead");
});

test("dead-letter recovery uses the configured lease duration", async () => {
    const db = fakeDb({ rowCount: 2 });
    assert.equal(await deadLetterExpiredJobs(120000, db), 2);
    assert.match(db.calls[0].sql, /attempts >= max_attempts/);
    assert.deepEqual(db.calls[0].values, [120000]);
});

test("scheduled business handlers cover all organizations and preserve financial idempotency", async () => {
    const db = fakeDb({ rowCount: 0 });
    const generated = [];
    const handlers = createJobHandlers({
        db,
        async generateRentCycles(...args) {
            generated.push(args);
            return { generated: 2 };
        },
    });

    assert.deepEqual(await handlers["generate-rent"]({ runDate: "2026-02-28" }), {
        generated: 2,
    });
    assert.deepEqual(generated, [[db, "2026-02-28"]]);

    await handlers["mark-overdue"]();
    assert.match(db.calls[0].sql, /rd\.amount_paise >/);
    assert.match(db.calls[0].sql, /payment_reversals/);

    db.query = async (sql, values) => {
        db.calls.push({ sql, values });
        return { rowCount: 3 };
    };
    assert.deepEqual(await handlers["create-rent-reminders"]({ runDate: "2026-02-28", leadDays: 3 }), { created: 3 });
    assert.match(db.calls[1].sql, /ON CONFLICT \(idempotency_key\) DO NOTHING/);
    assert.deepEqual(db.calls[1].values, ["2026-02-28", 3]);
});

test("unknown jobs are surfaced as handler errors rather than silently succeeding", async () => {
    const handlers = createJobHandlers({ db: fakeDb({ rows: [] }) });
    await assert.rejects(executeJob(handlers, { job_type: "not-a-job", payload: {} }), {
        code: "UNKNOWN_JOB_TYPE",
    });
});
