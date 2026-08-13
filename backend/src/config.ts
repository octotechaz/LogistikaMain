import {
  LOOPBACK,
  validateCorsAllowlist,
} from "../../src/lib/env-validation-core.mjs";

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

function requireString(key: string, devFallback: string): string {
  const value = process.env[key];
  if (!value) {
    if (isProd()) throw new Error(`[backend] Missing required production env var: ${key}`);
    return devFallback;
  }
  return value;
}

function requireSecret(key: string, minLength: number, devFallback: string): string {
  const value = process.env[key];
  if (!value) {
    if (isProd()) throw new Error(`[backend] Missing required production env var: ${key}`);
    return devFallback;
  }
  if (isProd() && value.length < minLength) {
    throw new Error(`[backend] Production env var ${key} is too short (minimum ${minLength} characters)`);
  }
  return value;
}

/**
 * Parse CORS_ORIGIN as a comma-separated list of HTTPS base origins.
 * In production, every entry is validated against the known public/portal/admin host set.
 * Returns a Set<string> of allowed origins — never a raw comma string passed as one origin.
 */
function resolveCorsOrigins(): Set<string> {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) {
    if (isProd()) throw new Error("[backend] Missing required production env var: CORS_ORIGIN");
    return new Set(["http://127.0.0.1:3001"]);
  }
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
}

export const config = {
  port: Number(process.env.BACKEND_PORT || 4001),
  host: requireString("BACKEND_HOST", LOOPBACK),
  corsOrigins: resolveCorsOrigins(),
  jwtSecret: requireSecret(
    "JWT_SECRET",
    32,
    "development-secret-change-me-please-32-chars"
  ),
  authCookieName: "azlog_token",
  uploadDir: requireString("UPLOAD_DIR", "public/uploads"),
};
