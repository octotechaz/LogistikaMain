#!/usr/bin/env node
/**
 * Production boot: build DATABASE_URL from POSTGRES_*, migrate, then start app.
 * Avoids empty DATABASE_URL when shell $(...) swallows a failed command.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function buildDatabaseUrl() {
  const user = process.env.POSTGRES_USER?.trim();
  const password = process.env.POSTGRES_PASSWORD?.trim();
  const db = process.env.POSTGRES_DB?.trim();

  if (!user || !password || !db) {
    fail(
      "Missing POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB in container env.\n" +
        "Portainer → Stack → Environment variables: paste all keys from portainer-env.txt"
    );
  }

  if (
    /replace-with/i.test(password) ||
    password === "changeme" ||
    password === "password" ||
    password.length < 12
  ) {
    fail(
      "POSTGRES_PASSWORD is still a placeholder or too short (<12).\n" +
        "In Portainer env set a real POSTGRES_PASSWORD (and matching DATABASE_URL)."
    );
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@postgres:5432/${encodeURIComponent(db)}?schema=public`;
}

function run(command, args, env) {
  const result = spawnSync(command, args, {
    env,
    stdio: "inherit",
    shell: false,
  });
  return result.status ?? 1;
}

function sleepSync(ms) {
  spawnSync("sleep", [String(Math.ceil(ms / 1000))], { stdio: "ignore" });
}

for (const dir of [
  "/app/public/uploads",
  "/app/octo-admin/uploads",
  "/app/octo-admin/data",
  "/app/data",
]) {
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    // ignore
  }
}

async function ensureSqliteDatabases() {
  const sqlitePath = process.env.PUBLIC_LISTINGS_SQLITE_PATH ||
    path.join(process.cwd(), "data", "public-listings.sqlite");

  console.log(`Ensuring SQLite database at: ${sqlitePath}`);

  try {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(sqlitePath);

    db.exec(`
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

    db.exec(`
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

    const cols = db.prepare("PRAGMA table_info(public_categories)").all();
    const hasLabelTranslations = cols.some((c) => c.name === "label_translations");
    if (!hasLabelTranslations) {
      console.log("Adding label_translations column to public_categories...");
      db.exec(`ALTER TABLE public_categories ADD COLUMN label_translations TEXT`);
    }

    db.close();
    console.log("SQLite databases ready.");
  } catch (err) {
    console.error("SQLite ensure failed:", err);
    process.exit(1);
  }
}

const databaseUrl = buildDatabaseUrl();
const env = { ...process.env, DATABASE_URL: databaseUrl };

// The CargoPost edit-tracking columns were added additively. On volumes where the
// original migration was never applied (or Prisma's _prisma_migrations bookkeeping
// got out of sync), migrate deploy may skip them and the app would crash on every
// query. Ensure the columns exist here, independent of migration checksums.
// Only runs when the CargoPost table already exists, so fresh installs (where the
// table is created later by migrate deploy) are unaffected.
function ensureCargoPostEditTrackingColumns() {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  return prisma.$queryRawUnsafe(`
    SELECT to_regclass('public."CargoPost"') IS NOT NULL AS "exists"
  `)
    .then(async (rows) => {
      if (!rows || !rows[0] || !rows[0].exists) {
        await prisma.$disconnect();
        return;
      }
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "CargoPost"
          ADD COLUMN IF NOT EXISTS "lastEditedAt" TIMESTAMP(3),
          ADD COLUMN IF NOT EXISTS "editSnapshot" JSONB;
      `);
      await prisma.$disconnect();
    })
    .catch((error) => {
      prisma.$disconnect().catch(() => undefined);
      console.error("Could not ensure CargoPost edit-tracking columns:", error);
      process.exit(1);
    });
}

await ensureSqliteDatabases();



console.log(
  `DB target: ${process.env.POSTGRES_USER}@postgres:5432/${process.env.POSTGRES_DB}`
);

let migrated = false;
let lastHint = "";
await ensureCargoPostEditTrackingColumns();
for (let attempt = 1; attempt <= 20; attempt++) {
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    env,
    encoding: "utf8",
    shell: false,
  });
  const out = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.status === 0) {
    migrated = true;
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    break;
  }
  process.stderr.write(out);

  if (/role ".*" does not exist/i.test(out)) {
    lastHint =
      "Postgres volume was initialized with a different user. " +
      "Use the new volume path in compose (/datastore/logistika/postgres-16-v2) or wipe the old volume.";
    fail(lastHint);
  }
  if (/P1000|Authentication failed/i.test(out)) {
    lastHint =
      "Wrong DB password for the existing Postgres volume.\n" +
      "Portainer POSTGRES_PASSWORD must match the password used at first volume init.\n" +
      "OR wipe old data and redeploy (DESTROYS DB):\n" +
      "  rm -rf /datastore/logistika/postgres-16-logistika /datastore/logistika/postgres-16-v2 /datastore/logistika/postgres-new /datastore/logistika/postgres\n" +
      "  mkdir -p /datastore/logistika/postgres-16-v2";
    fail(lastHint);
  }
  if (/P1012|nonempty URL|empty string/i.test(out)) {
    fail("DATABASE_URL was empty — POSTGRES_* env vars are not reaching the app container.");
  }

  console.error(`migrate attempt ${attempt}/20 failed; waiting for postgres...`);
  sleepSync(3000);
}

if (!migrated) {
  fail(lastHint || "prisma migrate deploy failed after retries");
}

console.log("Ensuring PostgreSQL admin user (not from Portainer env)...");
{
  const adminResult = spawnSync("node", ["scripts/ensure-postgres-admin.mjs"], {
    env,
    encoding: "utf8",
    shell: false,
  });
  if (adminResult.stdout) process.stdout.write(adminResult.stdout);
  if (adminResult.stderr) process.stderr.write(adminResult.stderr);
  if (adminResult.status !== 0) {
    fail("Failed to ensure PostgreSQL admin user");
  }
}

const start = run("npm", ["run", "start"], env);
process.exit(start);
