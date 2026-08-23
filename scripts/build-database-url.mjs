#!/usr/bin/env node
/**
 * Build DATABASE_URL from POSTGRES_* so app credentials always match the DB container.
 * Prints the URL to stdout (no secrets logged beyond the URL itself for shell export).
 */
const user = process.env.POSTGRES_USER;
const password = process.env.POSTGRES_PASSWORD;
const db = process.env.POSTGRES_DB;

if (!user || !password || !db) {
  console.error(
    "Missing POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB — cannot build DATABASE_URL"
  );
  process.exit(1);
}

if (
  password.includes("replace-with") ||
  password === "changeme" ||
  password.length < 8
) {
  console.error(
    "POSTGRES_PASSWORD looks like a placeholder or is too short. Set a real password in Portainer env."
  );
  process.exit(1);
}

const url = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@postgres:5432/${encodeURIComponent(db)}?schema=public`;
process.stdout.write(url);
