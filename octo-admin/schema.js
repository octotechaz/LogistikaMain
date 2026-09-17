function ensureUserColumns(db) {
  const columns = db.prepare('PRAGMA table_info(users)').all().map((column) => column.name);

  if (!columns.includes('profile_picture')) {
    db.prepare('ALTER TABLE users ADD COLUMN profile_picture TEXT').run();
  }
}

module.exports = { ensureUserColumns };
