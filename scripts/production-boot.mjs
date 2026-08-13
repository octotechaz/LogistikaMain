#!/usr/bin/env node
/**
 * Production boot: build DATABASE_URL from POSTGRES_*, migrate, then start app.
 * Avoids empty DATABASE_URL when shell $(...) swallows a failed command.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

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

const databaseUrl = buildDatabaseUrl();
const env = { ...process.env, DATABASE_URL: databaseUrl };

console.log(
  `DB target: ${process.env.POSTGRES_USER}@postgres:5432/${process.env.POSTGRES_DB}`
);

let migrated = false;
let lastHint = "";
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
