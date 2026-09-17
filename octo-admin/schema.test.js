const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Database = require('better-sqlite3');

const { ensureUserColumns } = require('./schema');

test('ensureUserColumns adds profile_picture to a legacy users table', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'logistika-schema-'));
  const databasePath = path.join(directory, 'cargo.db');
  const db = new Database(databasePath);

  try {
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'USER',
        vehicle_type TEXT,
        capacity REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    ensureUserColumns(db);

    const columns = db.prepare('PRAGMA table_info(users)').all();
    const profilePicture = columns.find((column) => column.name === 'profile_picture');
    assert.deepEqual(profilePicture && { type: profilePicture.type, notnull: profilePicture.notnull }, {
      type: 'TEXT',
      notnull: 0,
    });
  } finally {
    db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
