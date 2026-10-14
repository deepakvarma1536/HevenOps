require("dotenv").config();
const { Pool } = require("pg");

const connectionOptions = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT || 5432),
    };

const pool = new Pool({
    ...connectionOptions,
    max: Number(process.env.DB_POOL_MAX || 10),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 10000),
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : false,
    application_name: "hevenops-api",
});

module.exports = pool;
