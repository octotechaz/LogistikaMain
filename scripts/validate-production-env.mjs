/**
 * Production env validator — prints only key names and status, never values.
 * Exit 0 when all required vars are present and valid.
 * Exit 1 when any are missing, malformed, or unsafe.
 *
 * Usage:
 *   node scripts/validate-production-env.mjs
 *   NODE_ENV=production node scripts/validate-production-env.mjs
 */

import {
  LOOPBACK,
  OCTO_ADMIN_PORT,
  BACKEND_PORT,
  validateInternalLoopbackUrl,
  validateHttpsBaseOrigin,
  validateBareDnsHostname,
  validatePostgresUrl,
  validateCorsAllowlist,
  validateExactPort,
  validatePublicHostDistinctness,
  validatePublicUrlAlignment,
} from "../src/lib/env-validation-core.mjs";

const REQUIRED_SECRETS = [
  { key: "JWT_SECRET", minLength: 32 },
  { key: "NEXTAUTH_SECRET", minLength: 32 },
  { key: "SESSION_SECRET", minLength: 32 },
];

const REQUIRED_STRINGS = [
  "DATABASE_URL",
  "PUBLIC_SITE_HOST",
  "PORTAL_HOST",
  "ADMIN_HOST",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "CORS_ORIGIN",
  "INTERNAL_ADMIN_URL",
  "INTERNAL_BACKEND_URL",
  "OCTO_ADMIN_HOST",
  "OCTO_ADMIN_PORT",
  "BACKEND_HOST",
  "BACKEND_PORT",
  "UPLOAD_DIR",
];

function ok(key) {
  process.stdout.write(`OK: ${key}\n`);
}

function check() {
  const errors = [];

  // ── secrets ─────────────────────────────────────────────────────────────────
  for (const { key, minLength } of REQUIRED_SECRETS) {
    const value = process.env[key];
    if (!value) {
      errors.push(`MISSING: ${key}`);
    } else if (value.length < minLength) {
      errors.push(`TOO_SHORT: ${key} (minimum ${minLength} characters)`);
    } else {
      ok(key);
    }
  }

  // ── presence check ───────────────────────────────────────────────────────────
  for (const key of REQUIRED_STRINGS) {
    if (!process.env[key]) {
      errors.push(`MISSING: ${key}`);
    }
  }

  // ── loopback host enforcement ────────────────────────────────────────────────
  const octoAdminHost = process.env.OCTO_ADMIN_HOST;
  if (octoAdminHost && octoAdminHost !== LOOPBACK) {
    errors.push(`UNSAFE: OCTO_ADMIN_HOST must be ${LOOPBACK}`);
  } else if (octoAdminHost) {
    ok("OCTO_ADMIN_HOST");
  }

  const backendHost = process.env.BACKEND_HOST;
  if (backendHost && backendHost !== LOOPBACK) {
    errors.push(`UNSAFE: BACKEND_HOST must be ${LOOPBACK}`);
  } else if (backendHost) {
    ok("BACKEND_HOST");
  }

  // ── internal URL validation (URL-parsed, no startsWith) ──────────────────────
  const internalAdminUrl = process.env.INTERNAL_ADMIN_URL;
  if (internalAdminUrl) {
    const r = validateInternalLoopbackUrl("INTERNAL_ADMIN_URL", internalAdminUrl, OCTO_ADMIN_PORT);
    if (!r.ok) {
      errors.push(`UNSAFE: ${r.error}`);
    } else {
      ok("INTERNAL_ADMIN_URL");
    }
  }

  const internalBackendUrl = process.env.INTERNAL_BACKEND_URL;
  if (internalBackendUrl) {
    const r = validateInternalLoopbackUrl("INTERNAL_BACKEND_URL", internalBackendUrl, BACKEND_PORT);
    if (!r.ok) {
      errors.push(`UNSAFE: ${r.error}`);
    } else {
      ok("INTERNAL_BACKEND_URL");
    }
  }

  // ── port enforcement ─────────────────────────────────────────────────────────
  const octoAdminPortRaw = process.env.OCTO_ADMIN_PORT;
  if (octoAdminPortRaw) {
    const n = Number(octoAdminPortRaw);
    const r = validateExactPort("OCTO_ADMIN_PORT", n, OCTO_ADMIN_PORT);
    if (!r.ok) {
      errors.push(`UNSAFE: ${r.error}`);
    } else {
      ok("OCTO_ADMIN_PORT");
    }
  }

  const backendPortRaw = process.env.BACKEND_PORT;
  if (backendPortRaw) {
    const n = Number(backendPortRaw);
    const r = validateExactPort("BACKEND_PORT", n, BACKEND_PORT);
    if (!r.ok) {
      errors.push(`UNSAFE: ${r.error}`);
    } else {
      ok("BACKEND_PORT");
    }
  }

  // ── DATABASE_URL ──────────────────────────────────────────────────────────────
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    const r = validatePostgresUrl(databaseUrl);
    if (!r.ok) {
      errors.push(`INVALID: ${r.error}`);
    } else {
      ok("DATABASE_URL");
    }
  }

  // ── public host vars — bare DNS ───────────────────────────────────────────────
  const canonicalHosts = {};
  for (const key of ["PUBLIC_SITE_HOST", "PORTAL_HOST", "ADMIN_HOST"]) {
    const v = process.env[key];
    if (v) {
      const r = validateBareDnsHostname(key, v);
      if (!r.ok) {
        errors.push(`INVALID: ${r.error}`);
      } else {
        canonicalHosts[key] = r.canonical;
        ok(key);
      }
    }
  }

  // ── pairwise distinctness of public host vars ─────────────────────────────────
  if (canonicalHosts.PUBLIC_SITE_HOST && canonicalHosts.PORTAL_HOST && canonicalHosts.ADMIN_HOST) {
    const dr = validatePublicHostDistinctness(
      canonicalHosts.PUBLIC_SITE_HOST,
      canonicalHosts.PORTAL_HOST,
      canonicalHosts.ADMIN_HOST
    );
    if (!dr.ok) {
      errors.push(`UNSAFE: ${dr.error}`);
    }
  }

  // ── public-facing URLs — HTTPS base origins ───────────────────────────────────
  for (const key of ["NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"]) {
    const v = process.env[key];
    if (v) {
      const r = validateHttpsBaseOrigin(key, v);
      if (!r.ok) {
        errors.push(`INVALID: ${r.error}`);
      } else {
        ok(key);
      }
    }
  }

  // ── URL alignment: NEXTAUTH_URL and NEXT_PUBLIC_APP_URL must match PUBLIC_SITE_HOST ──
  if (canonicalHosts.PUBLIC_SITE_HOST) {
    for (const key of ["NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"]) {
      const v = process.env[key];
      if (v) {
        const r = validatePublicUrlAlignment(key, v, canonicalHosts.PUBLIC_SITE_HOST);
        if (!r.ok) {
          errors.push(`UNSAFE: ${r.error}`);
        }
      }
    }
  }

  // ── CORS allowlist ────────────────────────────────────────────────────────────
  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    ok("CORS_ORIGIN");
  }

  // ── path vars ─────────────────────────────────────────────────────────────────
  for (const key of ["UPLOAD_DIR"]) {
    if (process.env[key]) ok(key);
  }

  return errors;
}

const errors = check();

if (errors.length > 0) {
  process.stderr.write(`\nProduction env validation FAILED:\n`);
  for (const e of errors) {
    process.stderr.write(`  ${e}\n`);
  }
  process.exit(1);
} else {
  process.stdout.write(`\nAll production env vars validated successfully.\n`);
  process.exit(0);
}
