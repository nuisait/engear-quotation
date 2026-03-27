const { Pool } = require('pg');
require('dotenv').config();

let poolConfig;
if (process.env.DB_HOST) {
  // Use individual params (avoids URL parsing issues with special chars in password)
  poolConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  };
} else {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')
      ? { rejectUnauthorized: false }
      : false
  };
}

const pool = new Pool(poolConfig);

// SQL to run in Supabase SQL Editor:
// CREATE TABLE IF NOT EXISTS users (
//   id            SERIAL PRIMARY KEY,
//   username      TEXT UNIQUE NOT NULL,
//   email         TEXT,
//   password_hash TEXT NOT NULL,
//   role          TEXT DEFAULT 'readonly',   -- admin | cfo | readonly
//   status        TEXT DEFAULT 'pending',    -- active | pending | disabled
//   created_at    TIMESTAMP DEFAULT NOW()
// );
// -- If table already exists, add columns:
// ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
// ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
// UPDATE users SET status = 'active' WHERE status IS NULL;

module.exports = pool;
