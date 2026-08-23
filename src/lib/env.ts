/**
 * Production env resolver — fail-closed.
 * Never logs or returns secret values; only key names and status.
 * All URL/hostname/port security decisions use URL parsing via env-validation-core.mjs.
 */

import {
  LOOPBACK,
  OCTO_ADMIN_PORT as CANONICAL_OCTO_ADMIN_PORT,
  BACKEND_PORT as CANONICAL_BACKEND_PORT,
  validateInternalLoopbackUrl,
  validateHttpsBaseOrigin,
  validateBareDnsHostname,
  validatePostgresUrl,
  validateCorsAllowlist,
  validateExactPort,
  validatePublicHostDistinctness,
  validatePublicUrlAlignment,
} from "./env-validation-core.mjs";

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvError";
  }
}

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Require a non-empty string env var. Throws in production; returns fallback in dev. */
function requireString(key: string, devFallback: string): string {
  const value = process.env[key];
  if (!value) {
    if (isProd()) throw new EnvError(`Missing required production env var: ${key}`);
    return devFallback;
  }
  return value;
}

/** Require a string of at least minLength chars. Throws in production if absent or too short. */
function requireSecret(key: string, minLength: number, devFallback: string): string {
  const value = process.env[key];
  if (!value) {
    if (isProd()) throw new EnvError(`Missing required production env var: ${key}`);
    return devFallback;
  }
  if (isProd() && value.length < minLength) {
    throw new EnvError(
      `Production env var ${key} is too short (minimum ${minLength} characters)`
    );
  }
  return value;
}

/** Require a port env var; returns a number. */
function requirePort(key: string, devFallback: number): number {
  const raw = process.env[key];
  if (!raw) {
    if (isProd()) throw new EnvError(`Missing required production env var: ${key}`);
    return devFallback;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new EnvError(`Production env var ${key} is not a valid port number`);
  }
  return n;
}

// ── Canonical URL/host assertions using env-validation-core ────────────────────

function assertInternalLoopbackUrl(key: string, raw: string, port: number): void {
  if (!isProd()) return;
  const result = validateInternalLoopbackUrl(key, raw, port);
  if (!result.ok) throw new EnvError(result.error);
}

function assertHttpsBaseOrigin(key: string, raw: string): void {
  if (!isProd()) return;
  const result = validateHttpsBaseOrigin(key, raw);
  if (!result.ok) throw new EnvError(result.error);
}

function assertBareDnsHostname(key: string, raw: string): string {
  if (!isProd()) return raw.trim().toLowerCase();
  const result = validateBareDnsHostname(key, raw);
  if (!result.ok) throw new EnvError(result.error);
  return result.canonical;
}

function assertPostgresUrl(raw: string): void {
  if (!isProd()) return;
  const result = validatePostgresUrl(raw);
  if (!result.ok) throw new EnvError(result.error);
}

function assertExactPort(key: string, value: number, expected: number): void {
  if (!isProd()) return;
  const result = validateExactPort(key, value, expected);
  if (!result.ok) throw new EnvError(result.error);
}

/** In production, OCTO_ADMIN_HOST and BACKEND_HOST must be 127.0.0.1. */
function assertLoopbackHost(key: string, value: string): void {
  if (isProd() && value !== LOOPBACK) {
    throw new EnvError(
      `Production env var ${key} must be ${LOOPBACK} (got a non-loopback value)`
    );
  }
}

/**
 * Parse and validate the CORS_ORIGIN allowlist.
 * Returns the parsed Set<string> of origins (HTTPS base origins from the known host set).
 * In development, returns a single-entry set with the loopback origin.
 */
function resolveCorsOrigins(
  publicSiteHost: string,
  portalHost: string,
  adminHost: string
): Set<string> {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) {
    if (isProd()) throw new EnvError(`Missing required production env var: CORS_ORIGIN`);
    return new Set(["http://127.0.0.1:3001"]);
  }
  if (!isProd()) {
    return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
  }
  const allowedHosts = [publicSiteHost, portalHost, adminHost];
  const result = validateCorsAllowlist(raw, allowedHosts);
  if (!result.ok) throw new EnvError(result.error);
  return result.origins;
}

// ── Resolved config ────────────────────────────────────────────────────────────

export type ResolvedEnv = {
  databaseUrl: string;
  jwtSecret: string;
  nextauthSecret: string;
  sessionSecret: string;
  publicSiteHost: string;
  portalHost: string;
  adminHost: string;
  nextauthUrl: string;
  nextPublicAppUrl: string;
  corsOrigins: Set<string>;
  internalAdminUrl: string;
  internalBackendUrl: string;
  octoAdminHost: string;
  octoAdminPort: number;
  backendHost: string;
  backendPort: number;
  uploadDir: string;
  publicListingsSqlitePath: string;
  octoAdminSqlitePath: string;
};

/**
 * Resolve and validate all required env vars.
 * Throws EnvError in production when any required value is absent, too short, or unsafe.
 * In development, returns safe defaults so the app boots without a full .env.
 */
export function resolveEnv(): ResolvedEnv {
  // ── loopback hosts ──────────────────────────────────────────────────────────
  const octoAdminHost = requireString("OCTO_ADMIN_HOST", LOOPBACK);
  const backendHost = requireString("BACKEND_HOST", LOOPBACK);
  assertLoopbackHost("OCTO_ADMIN_HOST", octoAdminHost);
  assertLoopbackHost("BACKEND_HOST", backendHost);

  // ── ports — exact values required in production ─────────────────────────────
  const octoAdminPort = requirePort("OCTO_ADMIN_PORT", CANONICAL_OCTO_ADMIN_PORT);
  const backendPort = requirePort("BACKEND_PORT", CANONICAL_BACKEND_PORT);
  assertExactPort("OCTO_ADMIN_PORT", octoAdminPort, CANONICAL_OCTO_ADMIN_PORT);
  assertExactPort("BACKEND_PORT", backendPort, CANONICAL_BACKEND_PORT);

  // ── internal service URLs — URL-parsed exact loopback:port ──────────────────
  const internalAdminUrl = requireString("INTERNAL_ADMIN_URL", `http://${LOOPBACK}:3005`);
  assertInternalLoopbackUrl("INTERNAL_ADMIN_URL", internalAdminUrl, CANONICAL_OCTO_ADMIN_PORT);

  const internalBackendUrl = requireString("INTERNAL_BACKEND_URL", `http://${LOOPBACK}:4001`);
  assertInternalLoopbackUrl("INTERNAL_BACKEND_URL", internalBackendUrl, CANONICAL_BACKEND_PORT);

  // ── public host vars — bare DNS hostnames (canonical lowercase) ────────────
  const publicSiteHostRaw = requireString("PUBLIC_SITE_HOST", "localhost");
  const portalHostRaw = requireString("PORTAL_HOST", "localhost");
  const adminHostRaw = requireString("ADMIN_HOST", "localhost");
  const publicSiteHost = assertBareDnsHostname("PUBLIC_SITE_HOST", publicSiteHostRaw);
  const portalHost = assertBareDnsHostname("PORTAL_HOST", portalHostRaw);
  const adminHost = assertBareDnsHostname("ADMIN_HOST", adminHostRaw);

  // ── pairwise distinctness of the three public hosts ─────────────────────────
  if (isProd()) {
    const distinctResult = validatePublicHostDistinctness(publicSiteHost, portalHost, adminHost);
    if (!distinctResult.ok) throw new EnvError(distinctResult.error);
  }

  // ── public-facing URLs — HTTPS base origins ─────────────────────────────────
  const nextauthUrl = requireString("NEXTAUTH_URL", "http://127.0.0.1:3001");
  assertHttpsBaseOrigin("NEXTAUTH_URL", nextauthUrl);

  const nextPublicAppUrl = requireString("NEXT_PUBLIC_APP_URL", "http://127.0.0.1:3001");
  assertHttpsBaseOrigin("NEXT_PUBLIC_APP_URL", nextPublicAppUrl);

  // ── URL alignment: NEXTAUTH_URL and NEXT_PUBLIC_APP_URL must match PUBLIC_SITE_HOST ──
  if (isProd()) {
    const nextauthAlignResult = validatePublicUrlAlignment("NEXTAUTH_URL", nextauthUrl, publicSiteHost);
    if (!nextauthAlignResult.ok) throw new EnvError(nextauthAlignResult.error);

    const nextPublicAlignResult = validatePublicUrlAlignment("NEXT_PUBLIC_APP_URL", nextPublicAppUrl, publicSiteHost);
    if (!nextPublicAlignResult.ok) throw new EnvError(nextPublicAlignResult.error);
  }

  // ── DATABASE_URL ─────────────────────────────────────────────────────────────
  const databaseUrl = requireString(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/az_logistika?schema=public"
  );
  assertPostgresUrl(databaseUrl);

  // ── CORS allowlist ───────────────────────────────────────────────────────────
  const corsOrigins = resolveCorsOrigins(publicSiteHost, portalHost, adminHost);

  return {
    databaseUrl,
    jwtSecret: requireSecret(
      "JWT_SECRET",
      32,
      "development-secret-change-me-please-32-chars"
    ),
    nextauthSecret: requireSecret(
      "NEXTAUTH_SECRET",
      32,
      "development-nextauth-secret-change-me-please"
    ),
    sessionSecret: requireSecret(
      "SESSION_SECRET",
      32,
      "development-session-secret-change-me-please"
    ),
    publicSiteHost,
    portalHost,
    adminHost,
    nextauthUrl,
    nextPublicAppUrl,
    corsOrigins,
    internalAdminUrl,
    internalBackendUrl,
    octoAdminHost,
    octoAdminPort,
    backendHost,
    backendPort,
    uploadDir: requireString("UPLOAD_DIR", "public/uploads"),
    publicListingsSqlitePath: requireString(
      "PUBLIC_LISTINGS_SQLITE_PATH",
      "data/public-listings.sqlite"
    ),
    octoAdminSqlitePath: requireString(
      "OCTO_ADMIN_SQLITE_PATH",
      "octo-admin/data/cargo.db"
    ),
  };
}

/**
 * Validate env without returning values — for the CLI script and tests.
 * Returns { ok: true } or { ok: false, errors: string[] } listing only key names.
 */
export function validateEnv(): { ok: true } | { ok: false; errors: string[] } {
  try {
    resolveEnv();
    return { ok: true };
  } catch (err) {
    if (err instanceof EnvError) {
      return { ok: false, errors: [err.message] };
    }
    return { ok: false, errors: ["Unknown validation error"] };
  }
}