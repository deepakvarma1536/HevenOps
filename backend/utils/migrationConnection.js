function migrationConnectionOptions(env = process.env) {
    const connectionString = env.MIGRATION_DATABASE_URL || env.DATABASE_URL;
    if (connectionString) return { connectionString };

    if (env.DB_HOST && env.DB_DATABASE && env.DB_USER && env.DB_PASSWORD) {
        return {
            host: env.DB_HOST,
            port: Number(env.DB_PORT || 5432),
            database: env.DB_DATABASE,
            user: env.DB_USER,
            password: env.DB_PASSWORD,
        };
    }

    throw new Error(
        "MIGRATION_DATABASE_URL, DATABASE_URL, or all of DB_HOST, DB_DATABASE, DB_USER, and DB_PASSWORD are required; refusing an implicit database connection."
    );
}

module.exports = { migrationConnectionOptions };
