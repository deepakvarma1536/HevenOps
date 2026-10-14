const { spawnSync } = require("node:child_process");
const { getSafeTestDatabaseUrl } = require("../test-support/isolated-test-db");

const testFiles = process.argv.slice(2);
if (testFiles.length === 0) {
    console.error("Usage: npm run test:integration -- test/authorization.integration.test.js");
    process.exit(2);
}

try {
    getSafeTestDatabaseUrl();
} catch (error) {
    console.error(error.message);
    process.exit(2);
}

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
    stdio: "inherit",
    env: { ...process.env },
});
if (result.error) {
    console.error(result.error.message);
    process.exit(1);
}
process.exit(result.status ?? 1);
