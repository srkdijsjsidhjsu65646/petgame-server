const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  token TEXT,
  token_expires INTEGER,
  gold INTEGER DEFAULT 9999,
  fullness INTEGER DEFAULT 0,
  hygiene INTEGER DEFAULT 100,
  energy INTEGER DEFAULT 100,
  food_croissant INTEGER DEFAULT 50,
  food_hamburger INTEGER DEFAULT 50,
  food_chicken INTEGER DEFAULT 50,
  has_helmet INTEGER DEFAULT 0,
  helmet_equipped INTEGER DEFAULT 0,
  is_vip INTEGER DEFAULT 0,
  last_vip_date TEXT DEFAULT '',
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
`);

module.exports = db;
