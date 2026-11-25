const { enqueueJob } = require("./jobQueue");

async function scheduleJobs(today, config = {}, enqueue = enqueueJob) {
    const maxAttempts = config.maxAttempts || 5;

    const jobs = [
        ["generate-rent", `rent-cycles:${today}`, { runDate: today }],
        ["mark-overdue", `mark-overdue:${today}`, { runDate: today }],
        ["create-rent-reminders", `rent-reminders:${today}`, {
            runDate: today,
            leadDays: config.reminderLeadDays ?? 3,
        }],
    ];
    const added = [];
    for (const [type, key, payload] of jobs) {
        if (await enqueue(type, key, payload, { maxAttempts })) added.push(key);
    }
    return added;
}

module.exports = { scheduleJobs };
