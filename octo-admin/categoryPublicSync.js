"use strict";

/**
 * Bridges octo-admin Postgres PublicCategory ↔ public-site SQLite public_categories.
 * Public marketing UI still reads SQLite; admin CRUD uses Postgres.
 */

const path = require("path");
const fs = require("fs");

const DEFAULT_CATEGORIES = [
  {
    id: "home",
    label: "Ev əşyaları",
    icon_key: "home",
    icon_tone: "text-lime-600",
    match_cargo_type: null,
    match_vehicle_type: null,
    match_keyword: "mebel",
    sort_order: 20,
    is_active: 1,
  },
  {
    id: "construction",
    label: "Tikinti",
    icon_key: "hammer",
    icon_tone: "text-sky-600",
    match_cargo_type: "Tikinti materialı",
    match_vehicle_type: null,
    match_keyword: null,
    sort_order: 30,
    is_active: 1,
  },
  {
    id: "food",
    label: "Qida",
    icon_key: "flask",
    icon_tone: "text-slate-500",
    match_cargo_type: "Ərzaq",
    match_vehicle_type: null,
    match_keyword: null,
    sort_order: 40,
    is_active: 1,
  },
  {
    id: "liquid",
    label: "Maye",
    icon_key: "car",
    icon_tone: "text-slate-500",
    match_cargo_type: null,
    match_vehicle_type: null,
    match_keyword: "maye",
    sort_order: 50,
    is_active: 1,
  },
  {
    id: "cold",
    label: "Soyuducu",
    icon_key: "snowflake",
    icon_tone: "text-violet-600",
    match_cargo_type: null,
    match_vehicle_type: null,
    match_keyword: "soyud",
    sort_order: 60,
    is_active: 1,
  },
  {
    id: "agri",
    label: "Kənd təs.",
    icon_key: "tractor",
    icon_tone: "text-yellow-700",
    match_cargo_type: null,
    match_vehicle_type: null,
    match_keyword: "meyvə,tərəvəz,taxıl,agro",
    sort_order: 70,
    is_active: 1,
  },
];

function resolveSqlitePath() {
  return (
    process.env.PUBLIC_LISTINGS_SQLITE_PATH ||
    path.join(process.cwd(), "data", "public-listings.sqlite")
  );
}

function openSqlite() {
  const Database = require("better-sqlite3");
  const dbPath = resolveSqlitePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS public_categories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      icon_key TEXT NOT NULL,
      icon_tone TEXT NOT NULL DEFAULT 'text-slate-500',
      match_cargo_type TEXT,
      match_vehicle_type TEXT,
      match_keyword TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    )
  `);
  return db;
}

function readSqliteCategories() {
  try {
    const db = openSqlite();
    const rows = db
      .prepare("SELECT * FROM public_categories ORDER BY sort_order ASC, label ASC")
      .all();
    db.close();
    return rows.map((row) => ({
      id: String(row.id),
      label: row.label,
      icon_key: row.icon_key || "boxes",
      icon_tone: row.icon_tone || "text-slate-500",
      match_cargo_type: row.match_cargo_type || null,
      match_vehicle_type: row.match_vehicle_type || null,
      match_keyword: row.match_keyword || null,
      sort_order: Number(row.sort_order) || 0,
      is_active: row.is_active ? 1 : 0,
    }));
  } catch (err) {
    console.error("[categoryPublicSync] readSqliteCategories failed:", err.message);
    return [];
  }
}

function upsertSqliteCategory(dto) {
  try {
    const db = openSqlite();
    db.prepare(`
      INSERT INTO public_categories (
        id, label, icon_key, icon_tone, match_cargo_type, match_vehicle_type,
        match_keyword, sort_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        icon_key = excluded.icon_key,
        icon_tone = excluded.icon_tone,
        match_cargo_type = excluded.match_cargo_type,
        match_vehicle_type = excluded.match_vehicle_type,
        match_keyword = excluded.match_keyword,
        sort_order = excluded.sort_order,
        is_active = excluded.is_active
    `).run(
      dto.id,
      dto.label,
      dto.icon_key || "boxes",
      dto.icon_tone || "text-slate-500",
      dto.match_cargo_type || null,
      dto.match_vehicle_type || null,
      dto.match_keyword || null,
      Number(dto.sort_order) || 0,
      dto.is_active ? 1 : 0
    );
    db.close();
  } catch (err) {
    console.error("[categoryPublicSync] upsertSqliteCategory failed:", err.message);
  }
}

function deleteSqliteCategory(id) {
  if (!id) return;
  try {
    const db = openSqlite();
    db.prepare("DELETE FROM public_categories WHERE id = ?").run(String(id));
    db.close();
  } catch (err) {
    console.error("[categoryPublicSync] deleteSqliteCategory failed:", err.message);
  }
}

function makeCategoryPublicSync() {
  return {
    defaultCategories: DEFAULT_CATEGORIES,

    /** Import SQLite (or defaults) into empty Postgres PublicCategory table. */
    async ensurePostgresSeeded(prisma) {
      const existing = await prisma.publicCategory.count();
      if (existing > 0) return false;

      let source = readSqliteCategories();
      if (source.length === 0) source = DEFAULT_CATEGORIES;

      for (const cat of source) {
        await prisma.publicCategory.upsert({
          where: { legacySqliteId: cat.id },
          update: {
            label: cat.label,
            iconKey: cat.icon_key || "boxes",
            iconTone: cat.icon_tone || "text-slate-500",
            matchCargoType: cat.match_cargo_type || null,
            matchVehicleType: cat.match_vehicle_type || null,
            matchKeyword: cat.match_keyword || null,
            sortOrder: Number(cat.sort_order) || 0,
            isActive: Boolean(cat.is_active),
          },
          create: {
            legacySqliteId: cat.id,
            label: cat.label,
            iconKey: cat.icon_key || "boxes",
            iconTone: cat.icon_tone || "text-slate-500",
            matchCargoType: cat.match_cargo_type || null,
            matchVehicleType: cat.match_vehicle_type || null,
            matchKeyword: cat.match_keyword || null,
            sortOrder: Number(cat.sort_order) || 0,
            isActive: Boolean(cat.is_active),
          },
        });
        upsertSqliteCategory(cat);
      }
      return true;
    },

    upsertSqliteCategory,
    deleteSqliteCategory,
  };
}

module.exports = {
  makeCategoryPublicSync,
  DEFAULT_CATEGORIES,
};
