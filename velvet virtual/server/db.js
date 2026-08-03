const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const sqlite = new DatabaseSync(path.join(dataDir, 'velvet-virtual.db'));
sqlite.exec('PRAGMA journal_mode = WAL');

const db = {
  exec: (sql) => sqlite.exec(sql),
  prepare: (sql) => {
    const statement = sqlite.prepare(sql);
    return { run: (...values) => statement.run(...values), get: (...values) => statement.get(...values), all: (...values) => statement.all(...values) };
  },
};

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, google_id TEXT,
    display_name TEXT NOT NULL, avatar_url TEXT, role TEXT NOT NULL DEFAULT 'leitor',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, slug TEXT UNIQUE NOT NULL,
    description TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
    excerpt TEXT, content TEXT NOT NULL DEFAULT '', cover_url TEXT, category_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft', published_at TEXT, views INTEGER NOT NULL DEFAULT 0,
    is_featured INTEGER NOT NULL DEFAULT 0, created_by TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY(category_id) REFERENCES categories(id), FOREIGN KEY(created_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS banners (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, subtitle TEXT, image_url TEXT,
    cta_label TEXT, cta_url TEXT, position INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL
  );
`);

const postColumns = db.prepare('PRAGMA table_info(posts)').all().map((column) => column.name);
if (!postColumns.includes('views')) db.exec('ALTER TABLE posts ADD COLUMN views INTEGER NOT NULL DEFAULT 0');
if (!postColumns.includes('is_featured')) db.exec('ALTER TABLE posts ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0');
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((column) => column.name);
if (!userColumns.includes('google_id')) db.exec('ALTER TABLE users ADD COLUMN google_id TEXT');

module.exports = { db };
