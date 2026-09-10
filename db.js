const { Pool } = require("pg");

const pool = new Pool(
    process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        }
        : {
            user: "postgres",
            host: "localhost",
            database: "postgres",
            password: "process.env.DB.PASSWORD",
            port: 5432
        }
);

pool.connect()
    .then(() => {
        console.log("Database connected successfully!");
    })
    .catch((err) => {
        console.error("Database connection failed:", err.message);
    });

module.exports = pool;