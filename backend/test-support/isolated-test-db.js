const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Client, Pool } = require("pg");

function getSafeTestDatabaseUrl(value = process.env.TEST_DATABASE_URL) {
    if (!value) {
        throw new Error("TEST_DATABASE_URL must point to a dedicated PostgreSQL database ending in _test or _testdb");
    }

    let databaseUrl;
    try {
        databaseUrl = new URL(value);
    } catch {
        throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL");
    }

    const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
    if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
        !/(?:_test|_testdb)$/i.test(databaseName) ||
        /(?:prod|production|stage|staging)/i.test(databaseName)) {
        throw new Error("Refusing test database: TEST_DATABASE_URL must name a dedicated database ending in _test or _testdb");
    }

    return databaseUrl;
}

async function createIsolatedTestDatabase() {
    const databaseUrl = getSafeTestDatabaseUrl();
    const schema = `hevenops_test_${process.pid}_${crypto.randomBytes(6).toString("hex")}`;
    const admin = new Client({ connectionString: databaseUrl.toString() });
    await admin.connect();
    await admin.query(`CREATE SCHEMA "${schema}"`);

    const scopedUrl = new URL(databaseUrl);
    scopedUrl.searchParams.set("options", `-c search_path=${schema}`);
    const pool = new Pool({ connectionString: scopedUrl.toString(), max: 5 });

    return {
        pool,
        databaseUrl: scopedUrl.toString(),
        async migrate() {
            const migrationsPath = path.join(__dirname, "..", "migrations");
            const files = fs.readdirSync(migrationsPath)
                .filter((file) => /^\d+_.+\.up\.sql$/.test(file))
                .sort();
            for (const file of files) {
                await pool.query(fs.readFileSync(path.join(migrationsPath, file), "utf8"));
            }
        },
        async close() {
            await pool.end();
            try {
                await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
            } finally {
                await admin.end();
            }
        },
    };
}

module.exports = { createIsolatedTestDatabase, getSafeTestDatabaseUrl };
