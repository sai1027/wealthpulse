import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'wealthpulse.db');

fs.mkdirSync(DB_DIR, { recursive: true });

let db;

export async function initDB() {
  const SQL = await initSqlJs();

  // Load existing DB or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      icon TEXT DEFAULT '📁',
      category_type TEXT DEFAULT 'investment',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS field_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      field_name TEXT NOT NULL,
      field_label TEXT NOT NULL,
      field_type TEXT DEFAULT 'text',
      options TEXT DEFAULT NULL,
      is_required INTEGER DEFAULT 0,
      is_sensitive INTEGER DEFAULT 0,
      is_visible_in_summary INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS item_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      field_id INTEGER NOT NULL,
      value TEXT DEFAULT '',
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (field_id) REFERENCES field_definitions(id) ON DELETE CASCADE,
      UNIQUE(item_id, field_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS monthly_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      invested_value REAL DEFAULT 0,
      current_value REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      UNIQUE(item_id, month)
    )
  `);

  // Create indices (ignore if exist)
  const indices = [
    'CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id)',
    'CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_item_values_item ON item_values(item_id)',
    'CREATE INDEX IF NOT EXISTS idx_item_values_field ON item_values(field_id)',
    'CREATE INDEX IF NOT EXISTS idx_snapshots_item ON monthly_snapshots(item_id)',
    'CREATE INDEX IF NOT EXISTS idx_snapshots_month ON monthly_snapshots(month)',
  ];
  indices.forEach(idx => db.run(idx));

  saveDB();
  return db;
}

// ─── Helper wrappers to match better-sqlite3 style API ──────

/**
 * Run a query that returns rows (SELECT)
 */
export function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Run a query and return the first row
 */
export function queryGet(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

/**
 * Run a statement (INSERT, UPDATE, DELETE) and return { lastId, changes }
 */
export function runStmt(sql, params = []) {
  db.run(sql, params);
  const lastId = db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0] || 0;
  const changes = db.getRowsModified();
  saveDB();
  return { lastId, changes };
}

/**
 * Save DB to disk
 */
export function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export function getDB() {
  return db;
}
