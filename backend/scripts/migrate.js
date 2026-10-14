/* Transactional SQL migration runner. Never runs against an implicit database. */
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const command = process.argv[2] || 'up';
const migrationsDir = path.join(__dirname, '..', 'migrations');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for migrations; refusing to use an implicit database connection.');
}
if (!['up', 'status', 'baseline'].includes(command)) {
    throw new Error('Usage: node scripts/migrate.js <up|status|baseline VERSION>');
}

const migrations = fs.readdirSync(migrationsDir)
    .filter((file) => /^\d+_.+\.up\.sql$/.test(file))
    .sort()
    .map((file) => ({
        version: file.split('_')[0],
        file,
        sql: fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    }));

const checksum = (sql) => crypto.createHash('sha256').update(sql).digest('hex');

async function main() {
    const client = new Client({ connectionString: databaseUrl, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined });
    await client.connect();
    try {
        await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(50) PRIMARY KEY,
            filename TEXT NOT NULL,
            checksum CHAR(64) NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        const applied = new Map((await client.query('SELECT version, filename, checksum, applied_at FROM schema_migrations')).rows.map((row) => [row.version, row]));

        if (command === 'status') {
            for (const migration of migrations) {
                const row = applied.get(migration.version);
                console.log(`${row ? 'applied' : 'pending'}  ${migration.file}${row && row.checksum !== checksum(migration.sql) ? '  CHECKSUM MISMATCH' : ''}`);
            }
            return;
        }

        if (command === 'baseline') {
            const version = process.argv[3];
            if (!version || !migrations.some((migration) => migration.version === version)) {
                throw new Error('Provide an existing migration version to baseline.');
            }
            for (const migration of migrations.filter((item) => item.version <= version)) {
                await client.query(
                    `INSERT INTO schema_migrations (version, filename, checksum)
                     VALUES ($1, $2, $3) ON CONFLICT (version) DO NOTHING`,
                    [migration.version, migration.file, checksum(migration.sql)]
                );
            }
            console.log(`Baselined through ${version}. Run \`npm run migrate\` to apply later migrations.`);
            return;
        }

        for (const migration of migrations) {
            const previous = applied.get(migration.version);
            if (previous) {
                if (previous.checksum !== checksum(migration.sql)) {
                    throw new Error(`Checksum mismatch for applied migration ${migration.file}; never edit an applied migration.`);
                }
                continue;
            }
            await client.query('BEGIN');
            try {
                await client.query(migration.sql);
                await client.query(
                    'INSERT INTO schema_migrations (version, filename, checksum) VALUES ($1, $2, $3)',
                    [migration.version, migration.file, checksum(migration.sql)]
                );
                await client.query('COMMIT');
                console.log(`Applied ${migration.file}`);
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
        }
    } finally {
        await client.end();
    }
}

main().catch((error) => {
    console.error(`Migration failed: ${error.message}`);
    process.exitCode = 1;
});
