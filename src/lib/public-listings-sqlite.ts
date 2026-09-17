import "server-only";

import path from "node:path";
import { createRequire } from "node:module";
import type { CargoListing, PublicListingCategory } from "@/types/classifieds";

type DatabaseInstance = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    all: (...values: unknown[]) => Record<string, unknown>[];
    get: (...values: unknown[]) => Record<string, unknown> | undefined;
    run: (...values: unknown[]) => void;
  };
};

type SqliteModule = {
  DatabaseSync: new (path: string) => DatabaseInstance;
};

type SqliteListingRow = {
  id: string;
  owner_id: string;
  owner_name: string;
  owner_phone: string;
  title: string;
  cargo_type: string;
  description: string;
  weight: number;
  volume: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  quantity: string | null;
  pickup_city: string;
  pickup_address: string;
  delivery_city: string;
  delivery_address: string;
  pickup_date: string | null;
  pickup_deadline_date: string | null;
  pickup_time: string | null;
  vehicle_type: string | null;
  price: number | null;
  note: string | null;
  created_at: string;
  approved_at: string | null;
  expires_at: string | null;
  status: CargoListing["status"];
  image_url: string | null;
  image_urls: string | null;
};

type SqliteCategoryRow = {
  id: string;
  label: string;
  icon_key: string;
  icon_tone: string;
  match_cargo_type: string | null;
  match_vehicle_type: string | null;
  match_keyword: string | null;
  sort_order: number;
  is_active: number;
};

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as SqliteModule;
const databasePath = process.env.PUBLIC_LISTINGS_SQLITE_PATH || path.join(process.cwd(), "data", "public-listings.sqlite");

let database: DatabaseInstance | null = null;

function getDatabase() {
  if (!database) {
    database = new DatabaseSync(databasePath);
    database.exec(`
      CREATE TABLE IF NOT EXISTS public_listings (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        owner_phone TEXT NOT NULL,
        title TEXT NOT NULL,
        cargo_type TEXT NOT NULL,
        description TEXT NOT NULL,
        weight REAL NOT NULL,
        volume REAL,
        length REAL,
        width REAL,
        height REAL,
        quantity TEXT,
        pickup_city TEXT NOT NULL,
        pickup_address TEXT NOT NULL,
        delivery_city TEXT NOT NULL,
        delivery_address TEXT NOT NULL,
        pickup_date TEXT,
        pickup_deadline_date TEXT,
        pickup_time TEXT,
        vehicle_type TEXT,
        price REAL,
        note TEXT,
        created_at TEXT NOT NULL,
        approved_at TEXT,
        expires_at TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        image_url TEXT,
        image_urls TEXT
      )
    `);
    database.exec(`
      CREATE TABLE IF NOT EXISTS public_categories (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        label_translations TEXT,
        icon_key TEXT NOT NULL,
        icon_tone TEXT NOT NULL DEFAULT 'text-slate-500',
        match_cargo_type TEXT,
        match_vehicle_type TEXT,
        match_keyword TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1
      )
    `);
  }

  return database;
}

function parseImageUrls(row: SqliteListingRow) {
  const urls = row.image_urls
    ? row.image_urls
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean)
    : [];

  return Array.from(new Set([row.image_url || "", ...urls].filter(Boolean)));
}

function mapListing(row: SqliteListingRow): CargoListing {
  const photos = parseImageUrls(row);

  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerPhone: row.owner_phone,
    title: row.title,
    cargoType: row.cargo_type,
    description: row.description,
    weight: row.weight,
    volume: row.volume ?? undefined,
    length: row.length ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    quantity: row.quantity ?? "",
    pickupCity: row.pickup_city,
    pickupAddress: row.pickup_address,
    deliveryCity: row.delivery_city,
    deliveryAddress: row.delivery_address,
    pickupDate: row.pickup_date ?? undefined,
    pickupDeadlineDate: row.pickup_deadline_date ?? undefined,
    pickupTime: row.pickup_time ?? undefined,
    vehicleType: row.vehicle_type ?? undefined,
    price: row.price ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    expiresAt: row.expires_at,
    rejectionReason: null,
    status: row.status,
    photo: photos[0] ?? "",
    photos
  };
}

export function getPublicSqliteListings() {
  return getDatabase()
    .prepare("SELECT * FROM public_listings WHERE status = 'ACTIVE' ORDER BY datetime(created_at) DESC")
    .all()
    .map((row) => mapListing(row as unknown as SqliteListingRow));
}

export function getPublicSqliteListingById(id: string) {
  const row = getDatabase()
    .prepare("SELECT * FROM public_listings WHERE id = ? AND status = 'ACTIVE' LIMIT 1")
    .get(id) as unknown as SqliteListingRow | undefined;

  return row ? mapListing(row) : null;
}

function mapCategory(row: SqliteCategoryRow): PublicListingCategory {
  let labelTranslations: Record<string, string> | undefined;
  if ((row as unknown as { label_translations?: string }).label_translations) {
    try {
      labelTranslations = JSON.parse((row as unknown as { label_translations: string }).label_translations);
    } catch {
      labelTranslations = undefined;
    }
  }
  return {
    id: row.id,
    label: row.label,
    labelTranslations,
    iconKey: row.icon_key,
    iconTone: row.icon_tone,
    matchCargoType: row.match_cargo_type ?? undefined,
    matchVehicleType: row.match_vehicle_type ?? undefined,
    matchKeyword: row.match_keyword ?? undefined,
    sortOrder: row.sort_order,
    isActive: row.is_active === 1
  };
}

export function getPublicSqliteCategories({ includeInactive = false } = {}) {
  const sql = includeInactive
    ? "SELECT * FROM public_categories ORDER BY sort_order ASC, label ASC"
    : "SELECT * FROM public_categories WHERE is_active = 1 ORDER BY sort_order ASC, label ASC";

  return getDatabase()
    .prepare(sql)
    .all()
    .map((row) => mapCategory(row as unknown as SqliteCategoryRow));
}

export function upsertPublicSqliteCategory(category: PublicListingCategory) {
  getDatabase()
    .prepare(`
      INSERT INTO public_categories (
        id, label, label_translations, icon_key, icon_tone, match_cargo_type, match_vehicle_type,
        match_keyword, sort_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        label_translations = excluded.label_translations,
        icon_key = excluded.icon_key,
        icon_tone = excluded.icon_tone,
        match_cargo_type = excluded.match_cargo_type,
        match_vehicle_type = excluded.match_vehicle_type,
        match_keyword = excluded.match_keyword,
        sort_order = excluded.sort_order,
        is_active = excluded.is_active
    `)
    .run(
      category.id,
      category.label,
      category.labelTranslations ? JSON.stringify(category.labelTranslations) : null,
      category.iconKey,
      category.iconTone,
      category.matchCargoType || null,
      category.matchVehicleType || null,
      category.matchKeyword || null,
      category.sortOrder,
      category.isActive ? 1 : 0
    );
}

export function deletePublicSqliteCategory(id: string) {
  getDatabase().prepare("DELETE FROM public_categories WHERE id = ?").run(id);
}
