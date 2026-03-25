const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')
    ? { rejectUnauthorized: false }
    : false
});

// SQL to run in Supabase SQL Editor to create users table:
// CREATE TABLE IF NOT EXISTS users (
//   id            SERIAL PRIMARY KEY,
//   username      TEXT UNIQUE NOT NULL,
//   password_hash TEXT NOT NULL,
//   role          TEXT DEFAULT 'viewer',
//   created_at    TIMESTAMP DEFAULT NOW()
// );

module.exports = pool;
