/**
 * Pure host-policy helper for Next.js middleware.
 * No Next.js imports — fully testable with node:test.
 *
 * Architectural principle:
 *   - /auth, /dashboard/*, /octo-admin/*, /uploads/* are proxied to Express by
 *     Next.js rewrites (next.config.mjs). Express is the sole host/role
 *     authority for that surface. Next middleware MUST pass these through
 *     unconditionally — never redirect or block them.
 *   - /api/admin/* → ADMIN_HOST only
 *   - /api/public/* and /api/health → PUBLIC_SITE_HOST only
 *   - All other /api/* → PORTAL_HOST only (not ADMIN_HOST or PUBLIC_SITE_HOST)
 *   - Portal user pages → PORTAL_HOST only
 *   - /admin/* Next.js pages → ADMIN_HOST only (currently none exist but
 *     policy is in place for future use)
 *   - Everything else (public marketing pages) → PUBLIC_SITE_HOST only
 */

export interface HostConfig {
  publicSite: string;
  portal: string;
  admin: string;
}

/** Subset of process.env we read — injected for testability. */
export type EnvRecord = Partial<Record<string, string>>;

function isNgrokHostname(host: string | null | undefined): boolean {
  const bare = String(host || "").split(":")[0].toLowerCase();
  if (!bare) return false;
  return (
    bare.endsWith(".ngrok-free.app") ||
    bare.endsWith(".ngrok-free.dev") ||
    bare.endsWith(".ngrok.app") ||
    bare.endsWith(".ngrok.io") ||
    bare.endsWith(".ngrok.dev")
  );
}

function isNgrokTunnelMode(env: EnvRecord = process.env): boolean {
  if (env.NGROK_TUNNEL === "1" || env.NGROK_TUNNEL === "true") return true;
  return [env.PUBLIC_SITE_HOST, env.PORTAL_HOST, env.ADMIN_HOST].some((host) => isNgrokHostname(host));
}

/**
 * Request classification hint injected by the caller.
 * Allows the policy to distinguish browser HTML navigation from API/XHR.
 * When omitted the policy is conservative: non-HTML (no redirect, only 404).
 */
export interface RequestHint {
  method?: string;
  /** True only when method is GET/HEAD AND Accept includes text/html. */
  isHtmlRequest?: boolean;
}

// ── Prefix lists ──────────────────────────────────────────────────────────────

/**
 * Paths that Next.js rewrites to Express (next.config.mjs).
 * Middleware must pass these through unconditionally — Express is the
 * sole host/role authority for these surfaces.
 */
const EXPRESS_DELEGATED_PREFIXES = [
  "/dashboard",
  "/octo-admin",
  "/uploads",
];

/** Exact admin login path rewritten to Express (not /auth/login etc.). */
const EXPRESS_DELEGATED_EXACT = ["/auth"];

/** Portal user surfaces — must be on PORTAL_HOST. */
const PORTAL_USER_PREFIXES = [
  "/carrier",
  "/cargo-owner",
  "/driver/profile",
  "/dispatcher/profile",
  "/operator",
  "/login",
  "/register/carrier",
];

/** Admin surfaces (Next.js) — must be on ADMIN_HOST. */
const ADMIN_PREFIXES = [
  "/api/admin",
  "/admin",
];

/**
 * Public-site-only API prefixes.
 * These APIs serve the public marketing site and must only be accessible
 * on PUBLIC_SITE_HOST. They would 404 on portal/admin hosts.
 */
const PUBLIC_SITE_API_PREFIXES = [
  "/api/public",
  "/api/health",
];

/** Canonical production / local public hostnames for Tranzit.AZ. */
export const TRANZIT_DEFAULT_HOSTS = {
  publicSite: "tranzit.az",
  portal: "portal.tranzit.az",
  admin: "admin.tranzit.az",
} as const;

// ── Pure helpers ──────────────────────────────────────────────────────────────

function bareHost(host: string): string {
  if (!host) return "";
  const ipv6 = host.match(/^(\[.+\])(:\d+)?$/);
  if (ipv6) return ipv6[1];
  return host.split(":")[0];
}

/** Segment-boundary-safe prefix match (no /foo-bar matching /foo). */
function segmentMatch(path: string, prefix: string): boolean {
  const p = path.split("?")[0];
  return p === prefix || p.startsWith(prefix + "/");
}

/**
 * Return canonical host config from an env record.
 * Throws fail-closed in production when any host var is missing.
 */
export function getNextHosts(env: EnvRecord = process.env): HostConfig {
  const isProd = env.NODE_ENV === "production";

  if (isProd) {
    const missing: string[] = [];
    if (!env.PUBLIC_SITE_HOST) missing.push("PUBLIC_SITE_HOST");
    if (!env.PORTAL_HOST)      missing.push("PORTAL_HOST");
    if (!env.ADMIN_HOST)       missing.push("ADMIN_HOST");
    if (missing.length) {
      throw new Error(
        `Missing required production env vars: ${missing.join(", ")}`
      );
    }
  }

  return {
    publicSite: env.PUBLIC_SITE_HOST || "lvh.me:3001",
    portal:     env.PORTAL_HOST      || "portal.lvh.me:3001",
    admin:      env.ADMIN_HOST       || "admin.lvh.me:3005",
  };
}

function normalizeLoopbackHost(host: string): string {
  const bare = bareHost(host).toLowerCase();
  if (bare === "127.0.0.1" || bare === "::1" || bare === "[::1]") {
    return "localhost";
  }
  return bare;
}

/** True for local loopback-style hosts (use http even under NODE_ENV=production). */
function isLocalDevHost(host: string): boolean {
  const bare = bareHost(host).toLowerCase();
  return (
    bare === "localhost" ||
    bare.endsWith(".localhost") ||
    bare === "127.0.0.1" ||
    bare === "::1" ||
    bare === "[::1]" ||
    bare === "tranzit.test" ||
    bare.endsWith(".tranzit.test") ||
    bare === "lvh.me" ||
    bare.endsWith(".lvh.me") ||
    isNgrokHostname(bare)
  );
}

function isTunnelDevHost(host: string, env: EnvRecord = process.env): boolean {
  return isLocalDevHost(host) || (isNgrokTunnelMode(env) && isNgrokHostname(host));
}

function redirectScheme(host: string, env: EnvRecord): "http" | "https" {
  if (isNgrokHostname(host)) return "https";
  if (isLocalDevHost(host)) return "http";
  return env.NODE_ENV === "production" ? "https" : "http";
}

function redirectLocation(host: string, pathname: string, env: EnvRecord): string {
  return `${redirectScheme(host, env)}://${host}${pathname}`;
}

/** Check whether an incoming host header matches a configured host key. */
export function matchNextHost(
  incomingHost: string,
  key: keyof HostConfig,
  env: EnvRecord = process.env
): boolean {
  const hosts = getNextHosts(env);
  const expected = normalizeLoopbackHost(hosts[key]);
  const incoming = normalizeLoopbackHost(incomingHost);
  return expected !== "" && incoming === expected;
}

/**
 * Returns true for paths that Next.js rewrites to the Express backend.
 * Middleware must pass these through — Express owns host/role enforcement.
 */
export function isDelegatedToExpress(pathname: string): boolean {
  const p = pathname.split("?")[0];
  if (EXPRESS_DELEGATED_EXACT.includes(p)) return true;
  return EXPRESS_DELEGATED_PREFIXES.some((prefix) => segmentMatch(pathname, prefix));
}

/** Returns true for /api/admin/* or /admin/* (Next.js admin surfaces). */
export function isAdminPath(pathname: string): boolean {
  return ADMIN_PREFIXES.some((prefix) => segmentMatch(pathname, prefix));
}

/** Alias kept for existing imports. */
export const isAdminApiPath = isAdminPath;

/** Returns true for portal user surfaces — segment-boundary safe. */
export function isPortalUserPath(pathname: string): boolean {
  return PORTAL_USER_PREFIXES.some((prefix) => segmentMatch(pathname, prefix));
}

/** Returns true for public-site-only API paths. */
function isPublicSiteApiPath(pathname: string): boolean {
  return PUBLIC_SITE_API_PREFIXES.some((prefix) => segmentMatch(pathname, prefix));
}

/** Returns true for any /api/* path. */
function isAnyApiPath(pathname: string): boolean {
  const p = pathname.split("?")[0];
  return p === "/api" || p.startsWith("/api/");
}

// ── Policy decision ───────────────────────────────────────────────────────────

export type PolicyAction =
  | { action: "pass" }
  | { action: "block404" }
  | { action: "redirect"; location: string };

/**
 * Compute the host-policy decision for a given pathname + incoming host.
 *
 * Rules (checked in order):
 *
 * 0. Express-delegated paths (/auth exact, /dashboard/*, /octo-admin/*, /uploads/*):
 *    Always pass. Express is the sole authority.
 *
 * 1. Admin paths (/api/admin/*, /admin/*):
 *    - Correct host (ADMIN_HOST) → pass
 *    - /api/admin/* on wrong host → block404 (API calls never redirect)
 *    - /admin/* browser page on wrong host + isHtmlRequest → redirect to ADMIN_HOST
 *    - Otherwise → block404
 *
 * 2. Portal user paths (/carrier, /cargo-owner, /driver/profile, etc.):
 *    - Correct host (PORTAL_HOST) → pass
 *    - Browser HTML GET on wrong host → redirect to PORTAL_HOST
 *    - Otherwise → block404
 *
 * 3. Public-site-only APIs (/api/public/*, /api/health):
 *    - PUBLIC_SITE_HOST → pass
 *    - Other hosts → block404
 *
 * 4. Any remaining /api/* path (user auth APIs, portal APIs):
 *    - On portal host → pass
 *    - All other hosts (admin, public, unknown) → block404
 *
 * 5. Public/marketing pages:
 *    - On PUBLIC_SITE_HOST → pass
 *    - dev (all hosts may be same localhost) → pass
 *    - On wrong host + isHtmlRequest → redirect to PUBLIC_SITE_HOST
 *    - On wrong host + non-HTML → block404
 *
 * Query strings are preserved in all redirect locations.
 * Role/auth checks remain in auth middleware — host is an additional boundary.
 */
export function hostPolicyResult(
  pathname: string,
  incomingHost: string,
  env: EnvRecord = process.env,
  hint: RequestHint = {}
): PolicyAction {
  const hosts = getNextHosts(env);
  const isProd = env.NODE_ENV === "production";
  const isHtml = hint.isHtmlRequest === true;
  const method = (hint.method ?? "GET").toUpperCase();
  // Only GET/HEAD can be browser page navigations
  const canBePageNav = (method === "GET" || method === "HEAD") && isHtml;

  // Rule 0: Express-delegated paths always pass — never redirect or block.
  if (isDelegatedToExpress(pathname)) return { action: "pass" };

  // Rule 1: Admin paths (Next.js /api/admin/* and /admin/* pages)
  if (isAdminPath(pathname)) {
    if (matchNextHost(incomingHost, "admin", env)) return { action: "pass" };
    // API sub-path → always block
    if (isAnyApiPath(pathname)) return { action: "block404" };
    // /admin/* browser page → redirect
    if (canBePageNav) {
      return { action: "redirect", location: redirectLocation(hosts.admin, pathname, env) };
    }
    return { action: "block404" };
  }

  // Rule 2: Portal user paths
  if (isPortalUserPath(pathname)) {
    if (matchNextHost(incomingHost, "portal", env)) return { action: "pass" };
    if (canBePageNav) {
      return { action: "redirect", location: redirectLocation(hosts.portal, pathname, env) };
    }
    return { action: "block404" };
  }

  // Rule 3: Public-site-only APIs
  if (isPublicSiteApiPath(pathname)) {
    if (matchNextHost(incomingHost, "publicSite", env)) return { action: "pass" };
    // Local / ngrok dev: same Next process serves marketing pages on alternate hosts.
    if (!isProd && isTunnelDevHost(incomingHost, env)) return { action: "pass" };
    return { action: "block404" };
  }

  // Rule 4: Remaining /api/* paths — portal host + publicSite for auth APIs
  // /api/auth/* is called from tranzit.az (login, forgot-password, register-owner, etc.)
  // so it must be accessible on publicSite host as well as portal host.
  if (isAnyApiPath(pathname)) {
    if (matchNextHost(incomingHost, "portal", env)) return { action: "pass" };
    if (matchNextHost(incomingHost, "publicSite", env) && segmentMatch(pathname, "/api/auth")) return { action: "pass" };
    if (!isProd && isTunnelDevHost(incomingHost, env)) {
      return { action: "pass" };
    }
    return { action: "block404" };
  }

  // Rule 5: Public/marketing pages
  if (matchNextHost(incomingHost, "publicSite", env)) return { action: "pass" };
  // In development all three hosts may be the same localhost
  if (!isProd) return { action: "pass" };
  // On wrong host
  if (canBePageNav) {
    return { action: "redirect", location: redirectLocation(hosts.publicSite, pathname, env) };
  }
  return { action: "block404" };
}