"use strict";

const {
  isNgrokHostname,
  isNgrokTunnelMode,
} = require("../src/lib/env-validation-core.mjs");

const DEFAULT_MAX_AGE = 24 * 60 * 60 * 1000; // 1 day

// ── Route classifiers ─────────────────────────────────────────────────────────
// Exported and tested — single source of truth used by both middleware guards
// and index.js app.use() prefixes.

// Admin route prefixes — each entry is matched exactly OR as a segment parent
// (path === entry, path starts with entry + "/", or path starts with entry + "?").
// No raw startsWith to prevent /dashboard/istifadeciler-evil false-matching
// /dashboard/istifadeci. Both /istifadeciler and /istifadeci/* are listed
// explicitly.
const ADMIN_ROUTE_PREFIXES = [
  "/dashboard/istifadeciler",  // list view — exact + children
  "/dashboard/istifadeci",     // single-user actions /istifadeci/yarat, /istifadeci/123
  "/dashboard/kategoriler",
  "/dashboard/butun-elanlar",
  "/dashboard/elan/status",
  "/dashboard/elan/admin-sil",
  "/dashboard/whatsapp",
  "/octo-admin",
];

const PORTAL_ROUTE_PREFIXES = [
  "/dashboard/yeni-elan",
  "/dashboard/profil",
  "/dashboard/menim-elanlarim",
  "/dashboard/elan/sil",
];

/**
 * Segment-boundary-safe prefix match.
 * Returns true when path === prefix, starts with prefix + "/", or prefix + "?".
 */
function segmentMatch(path, prefix) {
  return path === prefix ||
    path.startsWith(prefix + "/") ||
    path.startsWith(prefix + "?");
}

/** Returns true when path belongs to admin-only routes. */
function isAdminRoute(path) {
  return ADMIN_ROUTE_PREFIXES.some((p) => segmentMatch(path, p));
}

/** Returns true when path belongs to portal-only user routes. */
function isPortalRoute(path) {
  return PORTAL_ROUTE_PREFIXES.some((p) => segmentMatch(path, p));
}

// ── Startup validation ────────────────────────────────────────────────────────

/**
 * Call once at process startup (before any request) to fail-closed when
 * production host vars are missing. In development it is a no-op.
 */
function validateHostsAtStartup() {
  getHosts(); // throws in production if any host is missing
}

// ── Core host helpers ─────────────────────────────────────────────────────────

/**
 * Return the three canonical host names from env, with safe dev defaults.
 * Throws fail-closed in production when any host is missing.
 * @returns {{ publicSite: string, portal: string, admin: string }}
 */
function getHosts() {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    const missing = [];
    if (!process.env.PUBLIC_SITE_HOST) missing.push("PUBLIC_SITE_HOST");
    if (!process.env.PORTAL_HOST)      missing.push("PORTAL_HOST");
    if (!process.env.ADMIN_HOST)       missing.push("ADMIN_HOST");
    if (missing.length) {
      throw new Error(
        `Missing required production env vars: ${missing.join(", ")} — refusing to start`
      );
    }
  }

  return {
    publicSite: process.env.PUBLIC_SITE_HOST || "lvh.me:3001",
    portal:     process.env.PORTAL_HOST      || "portal.lvh.me:3001",
    admin:      process.env.ADMIN_HOST       || "admin.lvh.me:3005",
  };
}

function isLocalDevHost(hostHeader) {
  const bare = bareHost(hostHeader).toLowerCase();
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

/**
 * Shared JWT cookie Domain for public/portal/admin (e.g. .tranzit.test).
 * Returns undefined when unsafe/unavailable (e.g. *.localhost PSL).
 */
function resolveAuthCookieDomain() {
  if (isNgrokTunnelMode(process.env)) {
    const explicit = (process.env.AUTH_COOKIE_DOMAIN || "").trim();
    return explicit || undefined;
  }

  const explicit = (process.env.AUTH_COOKIE_DOMAIN || "").trim();
  if (explicit) {
    const normalized = explicit.startsWith(".")
      ? explicit.toLowerCase()
      : `.${explicit.toLowerCase()}`;
    if (
      normalized === ".localhost" ||
      normalized === ".test" ||
      normalized === ".local"
    ) {
      return undefined;
    }
    return normalized;
  }

  const publicSite = bareHost(process.env.PUBLIC_SITE_HOST || "");
  const portal = bareHost(process.env.PORTAL_HOST || "");
  if (!publicSite || !portal) return undefined;
  if (portal === `portal.${publicSite}`) {
    if (publicSite === "localhost") return undefined;
    return `.${publicSite}`;
  }
  return undefined;
}

function authCookieSecureFlag(nodeEnv) {
  if (process.env.AUTH_COOKIE_SECURE === "true") return true;
  if (process.env.AUTH_COOKIE_SECURE === "false") return false;
  if (isNgrokTunnelMode(process.env)) return true;
  const hosts = getHosts();
  if (
    isLocalDevHost(hosts.publicSite) ||
    isLocalDevHost(hosts.portal) ||
    isLocalDevHost(hosts.admin)
  ) {
    return false;
  }
  const nextauth = process.env.NEXTAUTH_URL || "";
  if (nextauth.startsWith("http://")) return false;
  return nodeEnv === "production";
}

/** Options for clearing the Next.js azlog_token JWT cookie. */
function authCookieClearOptions(nodeEnv = process.env.NODE_ENV) {
  const domain = resolveAuthCookieDomain();
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: authCookieSecureFlag(nodeEnv),
    ...(domain ? { domain } : {}),
  };
}

/** Options for setting the Next.js azlog_token JWT cookie (Express; maxAge in ms). */
function authCookieSetOptions(maxAgeMs = 7 * 24 * 60 * 60 * 1000, nodeEnv = process.env.NODE_ENV) {
  const maxAge = Math.max(1000, Number(maxAgeMs) || 7 * 24 * 60 * 60 * 1000);
  return {
    ...authCookieClearOptions(nodeEnv),
    maxAge,
  };
}

/**
 * Extract the bare hostname from a Host header (strips optional :port).
 * @param {string} hostHeader
 * @returns {string}
 */
function bareHost(hostHeader) {
  if (!hostHeader) return "";
  // IPv6 literal: [::1]:port — keep the bracket form as the bare host
  const ipv6 = hostHeader.match(/^(\[.+\])(:\d+)?$/);
  if (ipv6) return ipv6[1];
  return hostHeader.split(":")[0];
}

/**
 * Check whether the incoming request's host matches the configured host for
 * the given key ("publicSite" | "portal" | "admin").
 *
 * When Express runs behind a trusted proxy (trust proxy = 1), req.hostname
 * already resolves x-forwarded-host → canonical hostname. We prefer that over
 * req.get("host") so that Next.js rewrites (which change the Host header to
 * 127.0.0.1:3005 on the upstream connection) don't break the host check.
 *
 * @param {object} req  — Express request (needs req.get and req.hostname)
 * @param {"publicSite"|"portal"|"admin"} hostKey
 * @returns {boolean}
 */
function matchHost(req, hostKey) {
  const hosts = getHosts();
  const configured = bareHost(hosts[hostKey]);
  // req.hostname is set by Express from x-forwarded-host (when trust proxy is
  // active) or from the Host header — always bare, never includes port.
  const incoming = req.hostname || bareHost(req.get("host") || "");
  if (configured === "" || incoming === "") return false;
  if (incoming === configured) return true;

  // Ngrok dev: allow any configured tunnel host on admin/portal routes.
  if (isNgrokTunnelMode(process.env) && process.env.NODE_ENV !== "production") {
    const allowed = new Set(
      [hosts.publicSite, hosts.portal, hosts.admin].map((host) => bareHost(host))
    );
    if (allowed.has(incoming)) return true;
  }

  // Local dev: treat localhost and 127.0.0.1 as equivalent loopback hosts.
  if (process.env.NODE_ENV !== "production") {
    const loopbacks = new Set(["localhost", "127.0.0.1"]);
    if (loopbacks.has(incoming) && loopbacks.has(configured)) return true;
    if (loopbacks.has(incoming) && isNgrokTunnelMode(process.env)) return true;
  }
  return false;
}

/**
 * Build the base URL (scheme + host) for redirect targets.
 * Production always uses https; development uses http.
 * @param {"publicSite"|"portal"|"admin"} hostKey
 * @returns {string}  e.g. "https://admin-logistika.octotech.az"
 */
function buildRedirectBase(hostKey) {
  const hosts = getHosts();
  const host = hosts[hostKey];
  return `${resolveUrlScheme(host)}://${host}`;
}

/**
 * Pick http vs https for absolute URLs.
 * Local dev hosts always use http, even when NODE_ENV=production.
 * @param {string} host — host header value, may include port
 * @returns {"http"|"https"}
 */
function resolveUrlScheme(host) {
  if (isNgrokHostname(host)) return "https";
  if (isLocalDevHost(host)) return "http";
  return process.env.NODE_ENV === "production" ? "https" : "http";
}

/**
 * Build an absolute URL for a host + path.
 * @param {string} host
 * @param {string} pathname — must start with /
 * @returns {string}
 */
function buildAbsoluteUrl(host, pathname) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${resolveUrlScheme(host)}://${host}${path}`;
}

/**
 * Return the trust-proxy value appropriate for the environment.
 * In production behind Traefik, we trust exactly one proxy hop.
 * @param {"production"|"development"|string} nodeEnv
 * @returns {number|boolean}
 */
function getTrustProxy(nodeEnv) {
  if (isNgrokTunnelMode(process.env)) return 1;
  return nodeEnv === "production" ? 1 : false;
}

/**
 * Build express-session options appropriate for the given NODE_ENV.
 * Throws fail-closed in production when SESSION_SECRET is absent.
 * @param {"production"|"development"|string} nodeEnv
 * @returns {object}
 */
function buildSessionOptions(nodeEnv) {
  const isProd = nodeEnv === "production";
  const secret = process.env.SESSION_SECRET || "";

  if (isProd && !secret) {
    throw new Error(
      "SESSION_SECRET env var is required in production — refusing to start with a weak default"
    );
  }

  const domain = resolveAuthCookieDomain();
  return {
    secret: secret || "dev-only-insecure-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure:   authCookieSecureFlag(nodeEnv),
      httpOnly: true,
      sameSite: "lax",
      ...(domain ? { domain } : {}),
      maxAge: DEFAULT_MAX_AGE,
    },
  };
}

// ── Host-boundary middleware ───────────────────────────────────────────────────
//
// Redirect policy: only browser HTML GET/HEAD requests get a redirect.
// Everything else (OPTIONS, XHR/JSON GET, /api/* GET, all mutations) gets 404.
// This prevents open-redirect misuse and leaking server existence to crawlers.

/** Returns true when the request looks like a browser HTML navigation. */
function isBrowserHtmlRequest(req) {
  // OPTIONS is never a browser page navigation
  if (req.method === "OPTIONS") return false;
  // Only GET/HEAD can be page navigations
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  // Any path containing /api/ is never an HTML page navigation
  const fullPath = req.path || req.originalUrl || "";
  if (fullPath.includes("/api/") || fullPath === "/api") return false;
  // Check Accept header via Express req.accepts()
  return !!(req.accepts && req.accepts("html"));
}

/**
 * Express middleware: allow only requests whose Host header matches ADMIN_HOST.
 * Browser HTML GET/HEAD on wrong host redirect to the admin host (https in prod).
 * All other wrong-host requests (API GET, OPTIONS, XHR, mutations) return 404.
 * Role checks remain in requireAdmin — this is an additional host boundary only.
 */
function requireAdminHost(req, res, next) {
  if (matchHost(req, "admin")) return next();

  if (isBrowserHtmlRequest(req)) {
    const target = buildRedirectBase("admin") + (req.originalUrl || req.path || "");
    return res.redirect(target);
  }

  return res.status(404).json({ error: "Not found" });
}

/**
 * Express middleware: allow only requests whose Host header matches PORTAL_HOST.
 * Browser HTML GET/HEAD on wrong host redirect to the portal host.
 * All other wrong-host requests return 404.
 * Role checks remain in requireAdmin — this is an additional host boundary only.
 */
function requirePortalHost(req, res, next) {
  if (matchHost(req, "portal")) return next();

  if (isBrowserHtmlRequest(req)) {
    const target = buildRedirectBase("portal") + (req.originalUrl || req.path || "");
    return res.redirect(target);
  }

  return res.status(404).json({ error: "Not found" });
}

/**
 * Host policy for GET /auth (canonical admin login).
 * - ADMIN_HOST: serve Express EJS login.
 * - Any other host + browser: redirect to ADMIN_HOST/auth.
 * - Non-browser on wrong host: 404.
 * - Development: allow.
 *
 * @param {string} incomingHost
 * @param {boolean} [isBrowserHtml]
 * @returns {{ action: "allow" } | { action: "redirect", location: string } | { action: "json404" }}
 */
function adminAuthGetHostPolicy(incomingHost, isBrowserHtml) {
  const isProd = process.env.NODE_ENV === "production";
  const hosts = getHosts();
  const incoming = bareHost(incomingHost);
  const onAdminHost = incoming === bareHost(hosts.admin);

  if (!isProd) return { action: "allow" };
  if (onAdminHost) return { action: "allow" };

  if (isBrowserHtml) {
    const scheme = isLocalDevHost(hosts.admin) ? "http" : "https";
    return { action: "redirect", location: `${scheme}://${hosts.admin}/auth` };
  }

  return { action: "json404" };
}

/**
 * Host policy for GET /dashboard/login.
 * - ADMIN_HOST: serve Express EJS login (allow).
 * - PORTAL / PUBLIC browser: redirect to portal Next /login.
 * - Unknown host: 404.
 * - Development: allow (local Express login on :3005).
 *
 * @param {string} incomingHost — the Host header value
 * @param {boolean} [isBrowserHtml] — true when request looks like a browser HTML navigation
 * @returns {{ action: "allow" } | { action: "redirect", location: string } | { action: "json404" }}
 */
function loginGetHostPolicy(incomingHost, isBrowserHtml) {
  const isProd = process.env.NODE_ENV === "production";
  const hosts = getHosts();
  const incoming = bareHost(incomingHost);
  const onAdminHost = incoming === bareHost(hosts.admin);
  const onPortalHost = incoming === bareHost(hosts.portal);
  const onPublicHost = incoming === bareHost(hosts.publicSite);

  if (!isProd) return { action: "allow" };

  if (onAdminHost) return { action: "allow" };

  const scheme = isLocalDevHost(hosts.portal) ? "http" : "https";

  if ((onPortalHost || onPublicHost) && isBrowserHtml) {
    return { action: "redirect", location: `${scheme}://${hosts.portal}/login` };
  }

  if (onPortalHost || onPublicHost) {
    return { action: "json404" };
  }

  return { action: "json404" };
}

/**
 * Pre-gate for login POST — called before any credential or DB lookup.
 * Returns { action: "allow" } when the host is admin or portal (may proceed
 * to credential check). Returns { action: "json404" } for public site or
 * unknown hosts, without touching the DB, session, or cookies.
 *
 * In development always returns { action: "allow" }.
 *
 * @param {string} incomingHost — the Host header value
 * @returns {{ action: "allow" } | { action: "json404" }}
 */
function loginPreGate(incomingHost) {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) return { action: "allow" };

  const hosts = getHosts();
  const incoming = bareHost(incomingHost);
  const onAdminHost  = incoming === bareHost(hosts.admin);
  const onPortalHost = incoming === bareHost(hosts.portal);

  if (onAdminHost || onPortalHost) return { action: "allow" };
  return { action: "json404" };
}

/**
 * Pre-gate for POST /auth — admin host only (never portal).
 *
 * @param {string} incomingHost
 * @returns {{ action: "allow" } | { action: "json404" }}
 */
function adminAuthPreGate(incomingHost) {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) return { action: "allow" };

  const hosts = getHosts();
  const onAdminHost = bareHost(incomingHost) === bareHost(hosts.admin);
  return onAdminHost ? { action: "allow" } : { action: "json404" };
}

/**
 * Determine whether a login POST should be allowed or blocked.
 * Returns { action: "allow" } or { action: "json404" }.
 *
 * A wrong-host POST returns a generic 404 — no redirect, no session, no
 * cookie. This prevents open redirect on POST and leaking role information
 * via redirect target.
 *
 * Rules:
 *   - ADMIN must POST to ADMIN_HOST
 *   - All other roles must POST to PORTAL_HOST
 *   - Any POST to PUBLIC_SITE_HOST → json404
 *   - Development: always allow
 *
 * @param {string} role        — user role from the database
 * @param {string} incomingHost — the Host header value
 * @returns {{ action: "allow" } | { action: "json404" }}
 */
function loginPostHostPolicy(role, incomingHost) {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) return { action: "allow" };

  const hosts = getHosts();
  const isAdminRole = role === "ADMIN";
  const onAdminHost  = bareHost(incomingHost) === bareHost(hosts.admin);
  const onPortalHost = bareHost(incomingHost) === bareHost(hosts.portal);

  if (isAdminRole) {
    return onAdminHost ? { action: "allow" } : { action: "json404" };
  }
  return onPortalHost ? { action: "allow" } : { action: "json404" };
}

/**
 * Build the redirect URL for requireAuth when the user is not logged in.
 * Admin host → same-host /auth.
 * Portal (and fallback) → portal Next /login.
 * Never redirects to PUBLIC_SITE_HOST as the login page itself.
 *
 * @param {string} incomingHost — the Host header value from the request
 * @returns {string}
 */
function requireAuthRedirectTarget(incomingHost) {
  const hosts = getHosts();
  const onAdminHost = bareHost(incomingHost) === bareHost(hosts.admin);
  const targetHost = onAdminHost ? hosts.admin : hosts.portal;
  const scheme = isLocalDevHost(targetHost) ? "http" : (process.env.NODE_ENV === "production" ? "https" : "http");

  if (onAdminHost) {
    return `${scheme}://${targetHost}/auth`;
  }

  if (process.env.NODE_ENV !== "production") {
    return "/login";
  }

  return `${scheme}://${hosts.portal}/login`;
}

/**
 * Build login redirect URL after logout or session loss.
 * Optional query params are appended for flash messages.
 *
 * @param {string} incomingHost
 * @param {Record<string, string>} [params]
 * @returns {string}
 */
function loginRedirectTarget(incomingHost, params = {}) {
  const base = requireAuthRedirectTarget(incomingHost);
  const qs = new URLSearchParams(params).toString();
  if (!qs) return base;
  return `${base}${base.includes("?") ? "&" : "?"}${qs}`;
}

/**
 * Determine the action for requireAuth when the user is not authenticated.
 * - Admin host: redirect to admin /auth
 * - Portal host: redirect to portal Next /login
 * - Public site or unknown/evil host: fail closed with 404
 *
 * @param {string} incomingHost — the Host header value from the request
 * @returns {{ action: "redirect", location: string } | { action: "json404" }}
 */
function requireAuthAction(incomingHost) {
  const isProd = process.env.NODE_ENV === "production";
  const hosts = getHosts();
  const incoming = bareHost(incomingHost);
  const onAdminHost = incoming === bareHost(hosts.admin);
  const onPortalHost = incoming === bareHost(hosts.portal);

  if (!isProd) {
    if (onAdminHost || !incomingHost) {
      const h = incomingHost || hosts.admin || "localhost:3005";
      return { action: "redirect", location: `http://${h}/auth` };
    }
    return { action: "redirect", location: "/login" };
  }

  if (onAdminHost) {
    const scheme = isLocalDevHost(hosts.admin) ? "http" : "https";
    return { action: "redirect", location: `${scheme}://${hosts.admin}/auth` };
  }
  if (onPortalHost) {
    const scheme = isLocalDevHost(hosts.portal) ? "http" : "https";
    return { action: "redirect", location: `${scheme}://${hosts.portal}/login` };
  }

  // Public site or unknown host: fail closed
  return { action: "json404" };
}

/**
 * Return the correct landing path after a successful login based on role.
 * ADMIN → /dashboard/butun-elanlar (admin UI)
 * All other roles → /dashboard/menim-elanlarim (portal UI)
 *
 * @param {string} role
 * @returns {string}
 */
function loginLandingPath(role) {
  return role === "ADMIN" ? "/dashboard/butun-elanlar" : "/dashboard/menim-elanlarim";
}

/**
 * Return the correct post-login destination while respecting the current host.
 * Non-admin sessions must never be stranded on the admin host.
 *
 * @param {string} role
 * @param {string} incomingHost
 * @returns {string}
 */
function loginLandingTarget(role, incomingHost) {
  const path = loginLandingPath(role);
  const isProd = process.env.NODE_ENV === "production";
  const hosts = getHosts();
  const incoming = bareHost(incomingHost || "");
  const onAdminHost = incoming === bareHost(hosts.admin);

  if (role === "ADMIN") {
    if (!isProd || onAdminHost || !incoming) {
      return path;
    }
    return buildAbsoluteUrl(hosts.admin, path);
  }

  if (!isProd || !onAdminHost) {
    return path;
  }

  return buildAbsoluteUrl(hosts.portal, path);
}

module.exports = {
  // Route classifiers — export for use in index.js app.use() and for testing
  isAdminRoute,
  isPortalRoute,
  ADMIN_ROUTE_PREFIXES,
  PORTAL_ROUTE_PREFIXES,
  // Startup
  validateHostsAtStartup,
  // Core helpers
  getHosts,
  bareHost,
  matchHost,
  buildRedirectBase,
  resolveUrlScheme,
  buildAbsoluteUrl,
  getTrustProxy,
  buildSessionOptions,
  resolveAuthCookieDomain,
  authCookieClearOptions,
  authCookieSetOptions,
  // Login host/role policy
  loginGetHostPolicy,
  adminAuthGetHostPolicy,
  loginPreGate,
  adminAuthPreGate,
  loginPostHostPolicy,
  requireAuthRedirectTarget,
  loginRedirectTarget,
  requireAuthAction,
  loginLandingPath,
  loginLandingTarget,
  // Middleware
  requireAdminHost,
  requirePortalHost,
  isBrowserHtmlRequest,
};
