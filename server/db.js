const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data.sqlite'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    quo_no     TEXT,
    client     TEXT,
    company    TEXT,
    phone      TEXT,
    email      TEXT,
    location   TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT,
    sub  TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS price_db (
    id     TEXT PRIMARY KEY,
    cat_id INTEGER REFERENCES categories(id),
    name   TEXT,
    unit   TEXT,
    mat    REAL DEFAULT 0,
    lab    REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS line_items (
    id         TEXT PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    cat_id     INTEGER,
    desc       TEXT,
    qty        REAL DEFAULT 0,
    unit       TEXT,
    mat        REAL DEFAULT 0,
    lab        REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS extras (
    project_id INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    travel     REAL DEFAULT 0,
    access_fee REAL DEFAULT 0,
    ot_mul     REAL DEFAULT 1,
    ot_pct     REAL DEFAULT 0,
    overhead   REAL DEFAULT 10,
    vat        REAL DEFAULT 7
  );

  CREATE TABLE IF NOT EXISTS revisions (
    id         TEXT PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    version    TEXT,
    date       TEXT,
    note       TEXT,
    items      INTEGER DEFAULT 0,
    total      REAL DEFAULT 0
  );
`);

module.exports = db;
