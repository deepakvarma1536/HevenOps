const assert = require("node:assert/strict");
const { test } = require("node:test");

process.env.LOG_LEVEL = "silent";
const { captureException } = require("../utils/errorTracker");

test("error tracking sends only sanitized exception metadata to the configured hook", async () => {
    const previousUrl = process.env.ERROR_TRACKING_WEBHOOK_URL;
    const previousFetch = global.fetch;
    let posted;
    process.env.ERROR_TRACKING_WEBHOOK_URL = "https://errors.example.test/intake";
    global.fetch = async (url, options) => {
        posted = { url, body: JSON.parse(options.body) };
        return { ok: true };
    };

    try {
        const error = Object.assign(new Error("sensitive exception detail"), {
            code: "DATABASE_UNAVAILABLE",
        });
        await captureException(error, { requestId: "request-123", jobId: 15, jobType: "mark-overdue" });
        assert.equal(posted.url, process.env.ERROR_TRACKING_WEBHOOK_URL);
        assert.deepEqual(
            {
                errorName: posted.body.errorName,
                errorCode: posted.body.errorCode,
                requestId: posted.body.requestId,
                jobId: posted.body.jobId,
                jobType: posted.body.jobType,
            },
            {
                errorName: "Error",
                errorCode: "DATABASE_UNAVAILABLE",
                requestId: "request-123",
                jobId: 15,
                jobType: "mark-overdue",
            }
        );
        assert.doesNotMatch(JSON.stringify(posted.body), /sensitive exception detail/);
        assert.ok(posted.body.occurredAt);
    } finally {
        global.fetch = previousFetch;
        if (previousUrl === undefined) delete process.env.ERROR_TRACKING_WEBHOOK_URL;
        else process.env.ERROR_TRACKING_WEBHOOK_URL = previousUrl;
    }
});

test("error metadata replaces names or codes that contain invalid characters", async () => {
    const previousUrl = process.env.ERROR_TRACKING_WEBHOOK_URL;
    const previousFetch = global.fetch;
    let posted;
    process.env.ERROR_TRACKING_WEBHOOK_URL = "https://errors.example.test/intake";
    global.fetch = async (_url, options) => {
        posted = JSON.parse(options.body);
        return { ok: true };
    };
    try {
        await captureException(
            Object.assign(new Error("omitted"), { name: "invalid value", code: "invalid value" }),
            { jobType: "invalid value" }
        );
        assert.equal(posted.errorName, "Error");
        assert.equal(posted.errorCode, undefined);
        assert.equal(posted.jobType, undefined);
        assert.doesNotMatch(JSON.stringify(posted), /invalid value/);
    } finally {
        global.fetch = previousFetch;
        if (previousUrl === undefined) delete process.env.ERROR_TRACKING_WEBHOOK_URL;
        else process.env.ERROR_TRACKING_WEBHOOK_URL = previousUrl;
    }
});
