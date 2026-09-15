const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // هذا السطر هو المطلق لتفعيل الاتصال على Render
  }
});

module.exports = pool;