/**
 * Production admin bootstrap script.
 *
 * Bootstraps exactly one ADMIN user in both:
 *   - Express/octo-admin SQLite DB (legacy-preserving atomic upsert)
 *   - PostgreSQL via Prisma (transaction-based, fail-closed policy)
 *
 * Usage:
 *   node scripts/bootstrap-production-admin.mjs
 *
 * Required env vars:
 *   PRODUCTION_ADMIN_NAME
 *   PRODUCTION_ADMIN_EMAIL
 *   PRODUCTION_ADMIN_PHONE
 *   PRODUCTION_ADMIN_PASSWORD
 *   DATABASE_URL          (Prisma PostgreSQL connection URL)
 *   OCTO_ADMIN_SQLITE_PATH  (path to the cargo.db SQLite file)
 *
 * Principles:
 *   - Never log the password, hash, or any credential value.
 *   - Error messages name env keys only — never values.
 *   - Fails closed on any conflict or unexpected state.
 *   - Normalization (email lowercase/trim, phone trim, name collapse) happens
 *     once and canonical values are used in both stores.
 */

import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { validatePostgresUrl } from "../src/lib/env-validation-core.mjs";

const require = createRequire(import.meta.url);
const passwordPolicy = require("../config/password-policy.json");

// ── bcrypt cost factor ────────────────────────────────────────────────────────
const BCRYPT_COST = 12;

// ── input validation ──────────────────────────────────────────────────────────

/**
 * Validate the admin bootstrap inputs (raw, pre-normalization).
 * Returns { ok: true } or { ok: false, error: string }.
 * Error messages name only the env key — never the supplied value.
 *
 * @param {{ name: string, email: string, phone: string, password: string }} inputs
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateBootstrapInputs({ name, email, phone, password }) {
  if (!name || !name.trim()) {
    return { ok: false, error: "PRODUCTION_ADMIN_NAME is required and must not be empty" };
  }
  if (!email || !email.trim()) {
    return { ok: false, error: "PRODUCTION_ADMIN_EMAIL is required and must not be empty" };
  }
  // Basic email structure: must contain exactly one @ with non-empty parts on both sides
  const trimmedEmail = email.trim();
  const atIdx = trimmedEmail.indexOf("@");
  if (
    atIdx <= 0 ||
    atIdx === trimmedEmail.length - 1 ||
    trimmedEmail.indexOf("@", atIdx + 1) !== -1
  ) {
    return { ok: false, error: "PRODUCTION_ADMIN_EMAIL must be a valid email address" };
  }
  if (!phone || !phone.trim()) {
    return { ok: false, error: "PRODUCTION_ADMIN_PHONE is required and must not be empty" };
  }
  if (!password) {
    return { ok: false, error: "PRODUCTION_ADMIN_PASSWORD is required and must not be empty" };
  }
  if (password.length < passwordPolicy.minimumLength) {
    return { ok: false, error: `PRODUCTION_ADMIN_PASSWORD must be at least ${passwordPolicy.minimumLength} characters` };
  }
  return { ok: true };
}

// ── input normalization ───────────────────────────────────────────────────────

/**
 * Normalize bootstrap inputs to canonical form.
 * Must be called after validation; returns a new object with:
 *   - email: trimmed and lowercased
 *   - phone: trimmed
 *   - name: trimmed with internal whitespace collapsed to single spaces
 *   - password: unchanged
 *
 * @param {{ name: string, email: string, phone: string, password: string }} inputs
 * @returns {{ name: string, email: string, phone: string, password: string }}
 */
export function normalizeInputs({ name, email, phone, password }) {
  return {
    name: name.trim().replace(/\s+/g, " "),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    password,
  };
}

// ── bootstrap configuration validator ────────────────────────────────────────

/**
 * Validate all required env vars for the bootstrap CLI.
 * Uses validatePostgresUrl for DATABASE_URL structural validation.
 * Never echoes values — error messages name only env keys and reasons.
 *
 * @param {Record<string, string | undefined>} env  An object of env key→value pairs
 * @returns {{ ok: true } | { ok: false; errors: string[] }}
 */
export function validateBootstrapConfig(env) {
  const errors = [];

  const adminValidation = validateBootstrapInputs({
    name: env.PRODUCTION_ADMIN_NAME || "",
    email: env.PRODUCTION_ADMIN_EMAIL || "",
    phone: env.PRODUCTION_ADMIN_PHONE || "",
    password: env.PRODUCTION_ADMIN_PASSWORD || "",
  });
  if (!adminValidation.ok) {
    errors.push(adminValidation.error);
  }

  if (!env.DATABASE_URL) {
    errors.push("DATABASE_URL is required");
  } else {
    const pgResult = validatePostgresUrl(env.DATABASE_URL);
    if (!pgResult.ok) {
      errors.push(pgResult.error);
    }
  }

  if (!env.OCTO_ADMIN_SQLITE_PATH) {
    errors.push("OCTO_ADMIN_SQLITE_PATH is required");
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true };
}

// ── sanitized error formatter ─────────────────────────────────────────────────

/**
 * Produce a safe, sanitized error message from a raw caught error.
 * Names only the store key (DATABASE_URL or OCTO_ADMIN_SQLITE_PATH) and the
 * operation. Never echoes hostname, database name, SQL text, input values,
 * passwords, or hash values.
 *
 * @param {unknown} rawErrorOrMessage  Raw error or message string from catch
 * @param {"DATABASE_URL" | "OCTO_ADMIN_SQLITE_PATH"} storeKey  Which store failed
 * @param {string} operation  Short label for the operation (e.g. "connect", "upsert")
 * @returns {string}
 */
export function sanitizeErrorMessage(rawErrorOrMessage, storeKey, operation) {
  return `Bootstrap operation failed: ${storeKey} [${operation}] — see logs for details`;
}

// ── structured safe error ─────────────────────────────────────────────────────

/** @typedef {"DATABASE_URL" | "OCTO_ADMIN_SQLITE_PATH"} StoreKey */

/**
 * Structured bootstrap error carrying only the store key and an allowlisted
 * operation label. Raw messages are never retained or exposed.
 */
export class BootstrapStoreError extends Error {
  /**
   * @param {StoreKey} storeKey
   * @param {string} operation  Short allowlisted label (e.g. "open", "upsert", "transaction", "disconnect")
   */
  constructor(storeKey, operation) {
    super(`Bootstrap operation failed: ${storeKey} [${operation}] — see logs for details`);
    this.name = "BootstrapStoreError";
    this.storeKey = storeKey;
    this.operation = operation;
  }
}

// ── name splitting utility ───────────────────────────────────────────────────

/**
 * Derive deterministic firstName / lastName from a canonical full name.
 * First word → firstName; remaining words joined with space → lastName.
 * Single word: lastName is empty string.
 *
 * @param {string} fullName  Already-normalized (collapsed whitespace)
 * @returns {{ firstName: string, lastName: string }}
 */
function splitName(fullName) {
  const parts = fullName.split(" ");
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

// ── PostgreSQL / Prisma bootstrap ────────────────────────────────────────────

/**
 * Bootstrap the production admin inside a Prisma transaction callback.
 *
 * Injectable: accepts any object that exposes `tx.user.{count,findMany,findFirst,create,update}`.
 * Pass a real Prisma transaction client in production; pass a fake in tests.
 *
 * Policy (applied to the total user count at the time of the transaction):
 *   - 0 users: create exactly one ADMIN with role ADMIN, status ACTIVE,
 *     canonical email/phone, bcrypt hash, and deterministic firstName/lastName.
 *   - 1 user: update safe fields and hash ONLY if the user matches by both
 *     email AND phone (the intended production admin). Otherwise fail closed.
 *   - 2+ users: fail closed regardless of whether one matches.
 *
 * Never deletes users. Never creates profiles or seed data.
 *
 * @param {object} tx  Prisma-compatible transaction client (or fake for tests)
 * @param {{ name: string, email: string, phone: string, password: string }} rawInputs
 * @returns {Promise<{ action: "created" | "updated" }>}
 */
export async function bootstrapPrismaAdmin(tx, rawInputs) {
  const validation = validateBootstrapInputs(rawInputs);
  if (!validation.ok) throw new Error(validation.error);

  const inputs = normalizeInputs(rawInputs);
  const { name, email, phone, password } = inputs;

  const count = await tx.user.count();

  if (count === 0) {
    const hash = await bcrypt.hash(password, BCRYPT_COST);
    const { firstName, lastName } = splitName(name);
    await tx.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        passwordHash: hash,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    return { action: "created" };
  }

  if (count > 1) {
    throw new Error(
      "CONFLICT: more than one user exists in PostgreSQL; failing closed to protect existing data"
    );
  }

  // Exactly one user
  const existing = await tx.user.findFirst({ where: { email, phone } });
  if (!existing) {
    throw new Error(
      "CONFLICT: sole existing user does not match PRODUCTION_ADMIN_EMAIL and PRODUCTION_ADMIN_PHONE; failing closed"
    );
  }

  if (existing.role !== "ADMIN") {
    throw new Error(
      "CONFLICT: sole matching user does not have role ADMIN; failing closed to prevent privilege escalation"
    );
  }

  const hash = await bcrypt.hash(password, BCRYPT_COST);
  const { firstName, lastName } = splitName(name);
  await tx.user.update({
    where: { id: existing.id },
    data: {
      firstName,
      lastName,
      email,
      phone,
      passwordHash: hash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  return { action: "updated" };
}

// ── SQLite bootstrap ──────────────────────────────────────────────────────────

/**
 * Bootstrap the production admin in an octo-admin SQLite database.
 *
 * Legacy-preserving: unrelated rows are never deleted or modified.
 * All resolution and mutation happen inside one better-sqlite3 transaction
 * for atomicity (bcrypt hash is computed before entering the transaction).
 *
 * Resolution rules (by canonical email and phone):
 *   1. Neither email nor phone found → insert new ADMIN row.
 *   2. Email and phone point to the same row → update that row to ADMIN.
 *   3. Only email found and target phone is not taken → update that row.
 *   4. Only phone found and target email is not taken → update that row.
 *   5. Email and phone point to different rows → fail closed (split identity).
 *   6. Only email found but target phone is already taken by another row → fail closed.
 *   7. Only phone found but target email is already taken by another row → fail closed.
 *
 * Never touches auth_info_baileys or any other table.
 *
 * @param {import("better-sqlite3").Database} db
 * @param {{ name: string, email: string, phone: string, password: string }} rawInputs
 * @returns {Promise<{ action: "created" | "updated" }>}
 */
export async function bootstrapSqliteAdmin(db, rawInputs) {
  const validation = validateBootstrapInputs(rawInputs);
  if (!validation.ok) throw new Error(validation.error);

  const inputs = normalizeInputs(rawInputs);
  const { name, email, phone, password } = inputs;

  // Hash BEFORE entering the synchronous transaction (bcrypt is async/slow)
  const hash = await bcrypt.hash(password, BCRYPT_COST);

  // All resolution logic and the single mutation run in one atomic transaction.
  // The transaction callback is synchronous (better-sqlite3 requirement).
  let resultAction;

  const txFn = db.transaction(() => {
    const byEmail = db.prepare("SELECT id, email, phone FROM users WHERE email = ?").get(email);
    const byPhone = db.prepare("SELECT id, email, phone FROM users WHERE phone = ?").get(phone);

    const emailId = byEmail ? byEmail.id : null;
    const phoneId = byPhone ? byPhone.id : null;

    if (!emailId && !phoneId) {
      // Rule 1: neither key found — insert
      db.prepare(
        "INSERT INTO users (email, phone, password, name, role) VALUES (?, ?, ?, ?, ?)"
      ).run(email, phone, hash, name, "ADMIN");
      resultAction = "created";
      return;
    }

    if (emailId && phoneId && emailId !== phoneId) {
      // Rule 5: split identity — fail closed
      throw new Error(
        "CONFLICT: PRODUCTION_ADMIN_EMAIL and PRODUCTION_ADMIN_PHONE belong to different rows; failing closed"
      );
    }

    if (emailId && phoneId && emailId === phoneId) {
      // Rule 2: both keys point to the same row — update
      db.prepare(
        "UPDATE users SET name = ?, email = ?, phone = ?, password = ?, role = ? WHERE id = ?"
      ).run(name, email, phone, hash, "ADMIN", emailId);
      resultAction = "updated";
      return;
    }

    if (emailId && !phoneId) {
      // Rule 3: only email matches; target phone is free — update that row
      db.prepare(
        "UPDATE users SET name = ?, email = ?, phone = ?, password = ?, role = ? WHERE id = ?"
      ).run(name, email, phone, hash, "ADMIN", emailId);
      resultAction = "updated";
      return;
    }

    if (phoneId && !emailId) {
      // Rule 4: only phone matches; target email is free — update that row
      db.prepare(
        "UPDATE users SET name = ?, email = ?, phone = ?, password = ?, role = ? WHERE id = ?"
      ).run(name, email, phone, hash, "ADMIN", phoneId);
      resultAction = "updated";
      return;
    }
  });

  // Execute; better-sqlite3 rolls back automatically on throw
  txFn();

  return { action: resultAction };
}

// ── resource-open helper ─────────────────────────────────────────────────────

/**
 * Open Prisma and SQLite connections with labeled error wrapping.
 *
 * Constructs Prisma first; if that throws, wraps as DATABASE_URL [open].
 * Constructs SQLite second; if that throws, wraps as OCTO_ADMIN_SQLITE_PATH [open]
 * and disconnects the already-created Prisma client before re-throwing.
 *
 * Injectable: accepts constructor functions so tests can inject fakes without
 * touching the real filesystem or database.
 *
 * @param {{ PrismaClientCtor: Function, DatabaseCtor: Function }} ctors
 * @param {string} sqlitePath
 * @returns {Promise<{ prisma: object, db: import("better-sqlite3").Database }>}
 */
export async function openResources({ PrismaClientCtor, DatabaseCtor }, sqlitePath) {
  let prisma;
  try {
    prisma = new PrismaClientCtor();
  } catch {
    throw new BootstrapStoreError("DATABASE_URL", "open");
  }

  let db;
  try {
    db = new DatabaseCtor(sqlitePath);
  } catch {
    // SQLite open failed — disconnect the already-created Prisma client before throwing
    try { await prisma.$disconnect(); } catch { /* best-effort */ }
    throw new BootstrapStoreError("OCTO_ADMIN_SQLITE_PATH", "open");
  }

  return { prisma, db };
}

// ── injectable CLI orchestration ─────────────────────────────────────────────

/**
 * Run bootstrap against both stores using injectable dependencies.
 * Prisma disconnect and SQLite close are both attempted unconditionally in
 * finally — no process.exit() calls inside this function.
 *
 * SQLite errors are wrapped as BootstrapStoreError(OCTO_ADMIN_SQLITE_PATH, …).
 * Prisma errors are wrapped as BootstrapStoreError(DATABASE_URL, …).
 * If cleanup itself fails and there was no prior error, the first sanitized
 * cleanup BootstrapStoreError is thrown after both cleanup attempts complete.
 * A primary bootstrap error is never masked by a cleanup error.
 *
 * @param {{ db: import("better-sqlite3").Database, prisma: object, rawInputs: object }} deps
 * @returns {Promise<{ sqlite: { action: string }, pg: { action: string } }>}
 */
export async function runBootstrap({ db, prisma, rawInputs }) {
  let primaryError = null;
  let sqliteResult, pgResult;

  try {
    try {
      sqliteResult = await bootstrapSqliteAdmin(db, rawInputs);
    } catch {
      throw new BootstrapStoreError("OCTO_ADMIN_SQLITE_PATH", "upsert");
    }

    try {
      pgResult = await prisma.$transaction(async (tx) => bootstrapPrismaAdmin(tx, rawInputs));
    } catch {
      throw new BootstrapStoreError("DATABASE_URL", "transaction");
    }

    return { sqlite: sqliteResult, pg: pgResult };
  } catch (err) {
    primaryError = err;
    throw err;
  } finally {
    // Both cleanup operations are attempted unconditionally.
    // The first cleanup error is recorded and thrown only after both attempts
    // complete, and only when no primary bootstrap error exists.
    let firstCleanupError = null;

    try {
      db.close();
    } catch {
      if (!primaryError && !firstCleanupError) {
        firstCleanupError = new BootstrapStoreError("OCTO_ADMIN_SQLITE_PATH", "close");
      }
    }

    try {
      await prisma.$disconnect();
    } catch {
      if (!primaryError && !firstCleanupError) {
        firstCleanupError = new BootstrapStoreError("DATABASE_URL", "disconnect");
      }
    }

    if (firstCleanupError) {
      throw firstCleanupError;
    }
  }
}

// ── CLI entry point ───────────────────────────────────────────────────────────

async function main() {
  // ── collect and validate all required env vars ────────────────────────────
  const name     = process.env.PRODUCTION_ADMIN_NAME;
  const email    = process.env.PRODUCTION_ADMIN_EMAIL;
  const phone    = process.env.PRODUCTION_ADMIN_PHONE;
  const password = process.env.PRODUCTION_ADMIN_PASSWORD;
  const sqlitePath = process.env.OCTO_ADMIN_SQLITE_PATH;

  const configResult = validateBootstrapConfig(process.env);
  if (!configResult.ok) {
    for (const err of configResult.errors) {
      process.stderr.write(`\nBootstrap FAILED: ${err}\n`);
    }
    process.exitCode = 1;
    return;
  }

  if (!existsSync(sqlitePath)) {
    process.stderr.write("\nBootstrap FAILED: OCTO_ADMIN_SQLITE_PATH does not point to an existing file\n");
    process.exitCode = 1;
    return;
  }

  const rawInputs = { name, email, phone, password };

  // ── open Prisma and SQLite (labeled errors, Prisma disconnected on SQLite failure) ──
  // Dynamic import keeps Prisma out of non-CLI code paths used by tests.
  const { PrismaClient } = await import("@prisma/client");

  let prisma, db;
  try {
    ({ prisma, db } = await openResources(
      { PrismaClientCtor: PrismaClient, DatabaseCtor: Database },
      sqlitePath
    ));
  } catch (err) {
    const msg = err instanceof BootstrapStoreError
      ? err.message
      : sanitizeErrorMessage(err, "DATABASE_URL", "open");
    process.stderr.write(`\nBootstrap FAILED: ${msg}\n`);
    process.exitCode = 1;
    return;
  }

  try {
    process.stdout.write("\nBootstrap: running SQLite admin bootstrap…\n");
    process.stdout.write("Bootstrap: running PostgreSQL admin bootstrap…\n");

    const results = await runBootstrap({ db, prisma, rawInputs });

    process.stdout.write(`Bootstrap SQLite: admin ${results.sqlite.action} (OCTO_ADMIN_SQLITE_PATH)\n`);
    process.stdout.write(`Bootstrap PostgreSQL: admin ${results.pg.action} (DATABASE_URL)\n`);
    process.stdout.write(
      "\nBootstrap OK: both stores updated successfully.\n" +
      "  Keys used: PRODUCTION_ADMIN_EMAIL, PRODUCTION_ADMIN_PHONE, PRODUCTION_ADMIN_NAME\n"
    );
  } catch (err) {
    const msg = err instanceof BootstrapStoreError
      ? err.message
      : sanitizeErrorMessage(err, "DATABASE_URL", "bootstrap");
    process.stderr.write(`\nBootstrap FAILED: ${msg}\n`);
    process.exitCode = 1;
    // db.close() and prisma.$disconnect() are guaranteed by runBootstrap's finally
  }
}

// Only run as CLI when executed directly (not imported by tests)
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("bootstrap-production-admin.mjs") ||
    process.argv[1] === new URL(import.meta.url).pathname);

if (isMain) {
  main().catch((err) => {
    process.stderr.write(`\nUnhandled error: ${sanitizeErrorMessage(err, "DATABASE_URL", "bootstrap")}\n`);
    process.exitCode = 1;
  });
}
