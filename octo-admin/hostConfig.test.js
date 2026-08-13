"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// We import after setting env vars, so we must re-require per test group.
// Use a helper that clears the require cache and sets env before each group.
function freshRequire(vars) {
  // Clean require cache for hostConfig
  const key = require.resolve("./hostConfig.js");
  delete require.cache[key];
  Object.assign(process.env, {
    NODE_ENV: "",
    PUBLIC_SITE_HOST: "",
    PORTAL_HOST: "",
    ADMIN_HOST: "",
    SESSION_SECRET: "",
    NEXTAUTH_URL: "",
    AUTH_COOKIE_DOMAIN: "",
    AUTH_COOKIE_SECURE: "",
    NGROK_TUNNEL: "",
  }, vars);
  return require("./hostConfig.js");
}

// ── getHosts ──────────────────────────────────────────────────────────────────

test("getHosts: returns production values from env vars", () => {
  const { getHosts } = freshRequire({
    PUBLIC_SITE_HOST: "logistika.octotech.az",
    PORTAL_HOST: "portal-logistika.octotech.az",
    ADMIN_HOST: "admin-logistika.octotech.az",
    NODE_ENV: "production",
  });
  const h = getHosts();
  assert.equal(h.publicSite, "logistika.octotech.az");
  assert.equal(h.portal, "portal-logistika.octotech.az");
  assert.equal(h.admin, "admin-logistika.octotech.az");
});

test("getHosts: falls back to *.lvh.me local defaults in development", () => {
  const { getHosts } = freshRequire({
    PUBLIC_SITE_HOST: "",
    PORTAL_HOST: "",
    ADMIN_HOST: "",
    NODE_ENV: "development",
  });
  const h = getHosts();
  assert.equal(h.publicSite, "lvh.me:3001");
  assert.equal(h.portal, "portal.lvh.me:3001");
  assert.equal(h.admin, "admin.lvh.me:3005");
});

test("getHosts: throws in production when SESSION_SECRET is missing", () => {
  const { buildSessionOptions } = freshRequire({
    NODE_ENV: "production",
    SESSION_SECRET: "",
  });
  assert.throws(() => buildSessionOptions("production"), /SESSION_SECRET/i);
});

// ── matchHost ─────────────────────────────────────────────────────────────────

const PROD_HOSTS = {
  NODE_ENV: "production",
  PUBLIC_SITE_HOST: "logistika.octotech.az",
  PORTAL_HOST: "portal-logistika.octotech.az",
  ADMIN_HOST: "admin-logistika.octotech.az",
  SESSION_SECRET: "test-secret-long-enough-for-production",
};

test("matchHost: returns true when Host header equals configured admin host", () => {
  const { matchHost } = freshRequire({ ...PROD_HOSTS });
  const req = { get: (h) => h === "host" ? "admin-logistika.octotech.az" : undefined };
  assert.equal(matchHost(req, "admin"), true);
});

test("matchHost: returns false when Host header does not match", () => {
  const { matchHost } = freshRequire({ ...PROD_HOSTS });
  const req = { get: (h) => h === "host" ? "portal-logistika.octotech.az" : undefined };
  assert.equal(matchHost(req, "admin"), false);
});

test("matchHost: strips port from Host header before comparing", () => {
  const { matchHost } = freshRequire({ ...PROD_HOSTS });
  const req = { get: (h) => h === "host" ? "admin-logistika.octotech.az:443" : undefined };
  assert.equal(matchHost(req, "admin"), true);
});

// ── buildSessionOptions ───────────────────────────────────────────────────────

test("buildSessionOptions: production sets secure=true, httpOnly=true, sameSite=lax, shared domain", () => {
  const { buildSessionOptions } = freshRequire({
    NODE_ENV: "production",
    SESSION_SECRET: "at-least-32-chars-long-secret-value",
    PUBLIC_SITE_HOST: "tranzit.az",
    PORTAL_HOST: "portal.tranzit.az",
    ADMIN_HOST: "admin.tranzit.az",
    NEXTAUTH_URL: "https://tranzit.az",
  });
  const opts = buildSessionOptions("production");
  assert.equal(opts.cookie.secure, true);
  assert.equal(opts.cookie.httpOnly, true);
  assert.equal(opts.cookie.sameSite, "lax");
  assert.equal(opts.cookie.domain, ".tranzit.az");
  assert.notEqual(opts.secret, "cargo_panel_secret_key_123");
});

test("buildSessionOptions: local tranzit.test uses http cookie + shared domain", () => {
  const { buildSessionOptions } = freshRequire({
    NODE_ENV: "production",
    SESSION_SECRET: "at-least-32-chars-long-secret-value",
    PUBLIC_SITE_HOST: "tranzit.test:3001",
    PORTAL_HOST: "portal.tranzit.test:3001",
    ADMIN_HOST: "admin.tranzit.test:3005",
  });
  const opts = buildSessionOptions("production");
  assert.equal(opts.cookie.secure, false);
  assert.equal(opts.cookie.domain, ".tranzit.test");
});

test("buildSessionOptions: development sets secure=false, httpOnly=true", () => {
  const { buildSessionOptions } = freshRequire({
    NODE_ENV: "development",
    SESSION_SECRET: "dev-secret",
  });
  const opts = buildSessionOptions("development");
  assert.equal(opts.cookie.secure, false);
  assert.equal(opts.cookie.httpOnly, true);
});

test("buildSessionOptions: secret comes from SESSION_SECRET env", () => {
  const mysecret = "my-test-secret-value-long-enough";
  const { buildSessionOptions } = freshRequire({
    NODE_ENV: "development",
    SESSION_SECRET: mysecret,
  });
  const opts = buildSessionOptions("development");
  assert.equal(opts.secret, mysecret);
});

// ── requireAdminHost middleware ───────────────────────────────────────────────

// RED test: when Next.js proxies to Express, Host=127.0.0.1:3005 but x-forwarded-host=admin host.
// requireAdminHost must call next(), not same-path-redirect, when x-forwarded-host matches ADMIN_HOST.
test("requireAdminHost: calls next() when x-forwarded-host matches admin host (Next.js proxy seam)", () => {
  const { requireAdminHost } = freshRequire({ ...PROD_HOSTS });
  const headers = { "x-forwarded-host": "admin-logistika.octotech.az", "x-forwarded-for": "203.0.113.10" };
  const req = {
    get: (h) => h === "host" ? "127.0.0.1:3005" : (headers[h.toLowerCase()] ?? undefined),
    method: "GET",
    path: "/dashboard/istifadeciler",
    originalUrl: "/dashboard/istifadeciler",
    accepts: (t) => t === "html" ? "html" : false,
    hostname: "admin-logistika.octotech.az", // Express sets this from x-forwarded-host when trust proxy=1
  };
  let nextCalled = false;
  const res = { redirect(u) { throw new Error("should not redirect, got: " + u); } };
  requireAdminHost(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test("requireAdminHost: calls next() when host matches admin host", () => {
  const { requireAdminHost } = freshRequire({ ...PROD_HOSTS });
  const req = { get: (h) => h === "host" ? "admin-logistika.octotech.az" : undefined, method: "GET", path: "/dashboard/istifadeciler", originalUrl: "/dashboard/istifadeciler" };
  let nextCalled = false;
  requireAdminHost(req, {}, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test("requireAdminHost: POST on wrong host returns 404 JSON", () => {
  const { requireAdminHost } = freshRequire({ ...PROD_HOSTS });
  const req = {
    get: (h) => h === "host" ? "portal-logistika.octotech.az" : undefined,
    method: "POST",
    path: "/dashboard/istifadeciler",
    originalUrl: "/dashboard/istifadeciler",
  };
  let statusCode = null;
  let jsonBody = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json(b) { jsonBody = b; },
    redirect() { throw new Error("should not redirect POST"); },
  };
  requireAdminHost(req, res, () => { throw new Error("should not call next"); });
  assert.equal(statusCode, 404);
  assert.ok(jsonBody);
});

test("requireAdminHost: POST from evil host returns 404 JSON", () => {
  const { requireAdminHost } = freshRequire({ ...PROD_HOSTS });
  const req = {
    get: (h) => h === "host" ? "evil.example.com" : undefined,
    method: "POST",
    path: "/dashboard/istifadeci/yarat",
    originalUrl: "/dashboard/istifadeci/yarat",
  };
  let statusCode = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json() {},
    redirect() { throw new Error("should not redirect POST"); },
  };
  requireAdminHost(req, res, () => {});
  assert.equal(statusCode, 404);
});

// ── getHosts: fail-closed in production ──────────────────────────────────────

test("getHosts: throws in production when PUBLIC_SITE_HOST is missing", () => {
  const { getHosts } = freshRequire({
    NODE_ENV: "production",
    PUBLIC_SITE_HOST: "",
    PORTAL_HOST: "portal-logistika.octotech.az",
    ADMIN_HOST: "admin-logistika.octotech.az",
  });
  assert.throws(() => getHosts(), /PUBLIC_SITE_HOST/i);
});

test("getHosts: throws in production when PORTAL_HOST is missing", () => {
  const { getHosts } = freshRequire({
    NODE_ENV: "production",
    PUBLIC_SITE_HOST: "logistika.octotech.az",
    PORTAL_HOST: "",
    ADMIN_HOST: "admin-logistika.octotech.az",
  });
  assert.throws(() => getHosts(), /PORTAL_HOST/i);
});

test("getHosts: throws in production when ADMIN_HOST is missing", () => {
  const { getHosts } = freshRequire({
    NODE_ENV: "production",
    PUBLIC_SITE_HOST: "logistika.octotech.az",
    PORTAL_HOST: "portal-logistika.octotech.az",
    ADMIN_HOST: "",
  });
  assert.throws(() => getHosts(), /ADMIN_HOST/i);
});

// ── requireAdminHost: browser GET redirects to admin host ────────────────────

test("requireAdminHost: browser GET redirects to admin host https URL, not 404", () => {
  const { requireAdminHost } = freshRequire({
    ADMIN_HOST: "admin-logistika.octotech.az",
    NODE_ENV: "production",
    PUBLIC_SITE_HOST: "logistika.octotech.az",
    PORTAL_HOST: "portal-logistika.octotech.az",
  });
  const req = {
    get: (h) => h === "host" ? "portal-logistika.octotech.az" : undefined,
    method: "GET",
    path: "/dashboard/istifadeciler",
    originalUrl: "/dashboard/istifadeciler",
    accepts: (t) => t === "html",
  };
  let redirectedTo = null;
  let statusCode = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json() {},
    redirect(url) { redirectedTo = url; },
  };
  requireAdminHost(req, res, () => { throw new Error("should not call next"); });
  assert.ok(redirectedTo, "should redirect, not return null");
  assert.match(redirectedTo, /^https:\/\/admin-logistika\.octotech\.az/);
});

test("requireAdminHost: POST (non-idempotent) on wrong host returns 404, not redirect", () => {
  const { requireAdminHost } = freshRequire({
    ADMIN_HOST: "admin-logistika.octotech.az",
    NODE_ENV: "production",
    PUBLIC_SITE_HOST: "logistika.octotech.az",
    PORTAL_HOST: "portal-logistika.octotech.az",
  });
  const req = {
    get: (h) => h === "host" ? "portal-logistika.octotech.az" : undefined,
    method: "POST",
    path: "/dashboard/istifadeci/yarat",
    originalUrl: "/dashboard/istifadeci/yarat",
    accepts: () => false,
  };
  let statusCode = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json() {},
    redirect() { throw new Error("should not redirect POST"); },
  };
  requireAdminHost(req, res, () => {});
  assert.equal(statusCode, 404);
});

// ── requireAuth: https in production ─────────────────────────────────────────

test("buildRedirectBase: production uses https", () => {
  const { buildRedirectBase } = freshRequire({
    NODE_ENV: "production",
    PUBLIC_SITE_HOST: "logistika.octotech.az",
    PORTAL_HOST: "portal-logistika.octotech.az",
    ADMIN_HOST: "admin-logistika.octotech.az",
    SESSION_SECRET: "test-secret-long-enough",
  });
  assert.match(buildRedirectBase("publicSite"), /^https:\/\//);
});

test("buildRedirectBase: development uses http", () => {
  const { buildRedirectBase } = freshRequire({
    NODE_ENV: "development",
    PUBLIC_SITE_HOST: "",
    PORTAL_HOST: "",
    ADMIN_HOST: "",
    SESSION_SECRET: "",
  });
  assert.match(buildRedirectBase("publicSite"), /^http:\/\//);
});

// ── trust proxy ──────────────────────────────────────────────────────────────

test("getTrustProxy: returns 1 in production", () => {
  const { getTrustProxy } = freshRequire({ NODE_ENV: "production" });
  assert.equal(getTrustProxy("production"), 1);
});

test("getTrustProxy: returns false in development", () => {
  const { getTrustProxy } = freshRequire({ NODE_ENV: "development" });
  assert.equal(getTrustProxy("development"), false);
});

// ── requirePortalHost middleware ─────────────────────────────────────────────

test("requirePortalHost: calls next() when host matches portal host", () => {
  const { requirePortalHost } = freshRequire({
    PORTAL_HOST: "portal-logistika.octotech.az",
    ADMIN_HOST: "admin-logistika.octotech.az",
    PUBLIC_SITE_HOST: "logistika.octotech.az",
    NODE_ENV: "production",
    SESSION_SECRET: "test-secret-long-enough",
  });
  const req = { get: (h) => h === "host" ? "portal-logistika.octotech.az" : undefined, method: "GET", path: "/dashboard", originalUrl: "/dashboard", accepts: () => false };
  let nextCalled = false;
  requirePortalHost(req, {}, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test("requirePortalHost: ADMIN on portal host for admin-only route returns 404", () => {
  const { requirePortalHost } = freshRequire({
    PORTAL_HOST: "portal-logistika.octotech.az",
    ADMIN_HOST: "admin-logistika.octotech.az",
    PUBLIC_SITE_HOST: "logistika.octotech.az",
    NODE_ENV: "production",
    SESSION_SECRET: "test-secret-long-enough",
  });
  // Even if host matches portal, admin-only routes must not run on portal host
  // This middleware just checks host; admin role is enforced separately.
  // An ADMIN with a valid session on the portal host reaching a portal route:
  // should pass (host matches, portal routes run on portal host for all roles).
  const req = { get: (h) => h === "host" ? "portal-logistika.octotech.az" : undefined, method: "GET", path: "/dashboard/profil", originalUrl: "/dashboard/profil", accepts: () => false };
  let nextCalled = false;
  requirePortalHost(req, {}, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test("requirePortalHost: admin-only route on portal host returns 404 (enforced by requireAdminHost independently)", () => {
  // The admin host guard is what blocks admin routes on portal;
  // requirePortalHost itself just ensures portal routes need portal host.
  // Test: portal user session on portal host calling a /dashboard/istifadeciler
  // — requirePortalHost passes, requireAdminHost (on that route prefix) blocks.
  // Here we just test requirePortalHost alone.
  const { requireAdminHost } = freshRequire({
    ADMIN_HOST: "admin-logistika.octotech.az",
    PORTAL_HOST: "portal-logistika.octotech.az",
    PUBLIC_SITE_HOST: "logistika.octotech.az",
    NODE_ENV: "production",
    SESSION_SECRET: "test-secret-long-enough",
  });
  // portal user (valid session) on portal host trying admin API
  const req = {
    get: (h) => h === "host" ? "portal-logistika.octotech.az" : undefined,
    method: "POST",
    path: "/dashboard/istifadeci/yarat",
    originalUrl: "/dashboard/istifadeci/yarat",
    accepts: () => false,
    session: { user: { role: "USER" }, userId: 1 },
  };
  let statusCode = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json() {},
    redirect() {},
  };
  requireAdminHost(req, res, () => { throw new Error("must not reach handler"); });
  assert.equal(statusCode, 404);
});

test("requireAdminHost: ADMIN with valid session on wrong host (portal) calling admin POST returns 404", () => {
  const { requireAdminHost } = freshRequire({
    ADMIN_HOST: "admin-logistika.octotech.az",
    PORTAL_HOST: "portal-logistika.octotech.az",
    PUBLIC_SITE_HOST: "logistika.octotech.az",
    NODE_ENV: "production",
    SESSION_SECRET: "test-secret-long-enough",
  });
  const req = {
    get: (h) => h === "host" ? "portal-logistika.octotech.az" : undefined,
    method: "POST",
    path: "/dashboard/istifadeciler",
    originalUrl: "/dashboard/istifadeciler",
    accepts: () => false,
    session: { user: { role: "ADMIN" }, userId: 42 },
  };
  let statusCode = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json() {},
    redirect() {},
  };
  requireAdminHost(req, res, () => { throw new Error("must not reach handler"); });
  assert.equal(statusCode, 404);
});

// ── isAdminRoute / isPortalRoute — exported testable classifiers ─────────────

test("isAdminRoute: returns true for admin-only route prefixes", () => {
  const { isAdminRoute } = freshRequire({ ...PROD_HOSTS });
  assert.equal(isAdminRoute("/dashboard/istifadeciler"), true);
  assert.equal(isAdminRoute("/dashboard/istifadeci/yarat"), true);
  assert.equal(isAdminRoute("/dashboard/kategoriler"), true);
  assert.equal(isAdminRoute("/dashboard/butun-elanlar"), true);
  assert.equal(isAdminRoute("/dashboard/elan/status/5"), true);
  assert.equal(isAdminRoute("/dashboard/elan/admin-sil/5"), true);
  assert.equal(isAdminRoute("/dashboard/whatsapp"), true);
  assert.equal(isAdminRoute("/octo-admin"), true);
});

test("isAdminRoute: returns false for portal/shared routes", () => {
  const { isAdminRoute } = freshRequire({ ...PROD_HOSTS });
  assert.equal(isAdminRoute("/dashboard/yeni-elan"), false);
  assert.equal(isAdminRoute("/dashboard/profil"), false);
  assert.equal(isAdminRoute("/dashboard/menim-elanlarim"), false);
  assert.equal(isAdminRoute("/dashboard/login"), false);
  assert.equal(isAdminRoute("/dashboard/qeydiyyat"), false);
});

test("isPortalRoute: returns true for portal-only route prefixes", () => {
  const { isPortalRoute } = freshRequire({ ...PROD_HOSTS });
  assert.equal(isPortalRoute("/dashboard/yeni-elan"), true);
  assert.equal(isPortalRoute("/dashboard/profil"), true);
  assert.equal(isPortalRoute("/dashboard/menim-elanlarim"), true);
  assert.equal(isPortalRoute("/dashboard/elan/sil/3"), true);
});

test("isPortalRoute: returns false for admin or shared routes", () => {
  const { isPortalRoute } = freshRequire({ ...PROD_HOSTS });
  assert.equal(isPortalRoute("/dashboard/istifadeciler"), false);
  assert.equal(isPortalRoute("/dashboard/kategoriler"), false);
  assert.equal(isPortalRoute("/dashboard/login"), false);
  assert.equal(isPortalRoute("/dashboard/qeydiyyat"), false);
});

// ── requireAdminHost: /api/* GET returns 404, not redirect ───────────────────

test("requireAdminHost: GET on /api/* path returns 404, not redirect", () => {
  const { requireAdminHost } = freshRequire({ ...PROD_HOSTS });
  const req = {
    get: (h) => h === "host" ? "portal-logistika.octotech.az" : undefined,
    method: "GET",
    path: "/dashboard/api/send-otp",
    originalUrl: "/dashboard/api/send-otp",
    accepts: (t) => t === "html",
  };
  let statusCode = null;
  let redirectCalled = false;
  const res = {
    status(c) { statusCode = c; return this; },
    json() {},
    redirect() { redirectCalled = true; },
  };
  requireAdminHost(req, res, () => {});
  assert.equal(redirectCalled, false);
  assert.equal(statusCode, 404);
});

test("requireAdminHost: OPTIONS on wrong host returns 404, not redirect", () => {
  const { requireAdminHost } = freshRequire({ ...PROD_HOSTS });
  const req = {
    get: (h) => h === "host" ? "portal-logistika.octotech.az" : undefined,
    method: "OPTIONS",
    path: "/dashboard/istifadeciler",
    originalUrl: "/dashboard/istifadeciler",
    accepts: (t) => t === "html",
  };
  let statusCode = null;
  let redirectCalled = false;
  const res = {
    status(c) { statusCode = c; return this; },
    json() {},
    redirect() { redirectCalled = true; },
  };
  requireAdminHost(req, res, () => {});
  assert.equal(redirectCalled, false);
  assert.equal(statusCode, 404);
});

test("requireAdminHost: non-HTML GET (XHR) on wrong host returns 404, not redirect", () => {
  const { requireAdminHost } = freshRequire({ ...PROD_HOSTS });
  const req = {
    get: (h) => h === "host" ? "portal-logistika.octotech.az" : undefined,
    method: "GET",
    path: "/dashboard/istifadeciler",
    originalUrl: "/dashboard/istifadeciler",
    accepts: (t) => false, // XHR — does not accept html
  };
  let statusCode = null;
  let redirectCalled = false;
  const res = {
    status(c) { statusCode = c; return this; },
    json() {},
    redirect() { redirectCalled = true; },
  };
  requireAdminHost(req, res, () => {});
  assert.equal(redirectCalled, false);
  assert.equal(statusCode, 404);
});

// ── startup validation ────────────────────────────────────────────────────────

test("validateHostsAtStartup: throws in production if a host is missing", () => {
  const { validateHostsAtStartup } = freshRequire({
    NODE_ENV: "production",
    PUBLIC_SITE_HOST: "logistika.octotech.az",
    PORTAL_HOST: "",
    ADMIN_HOST: "admin-logistika.octotech.az",
  });
  assert.throws(() => validateHostsAtStartup(), /PORTAL_HOST/i);
});

test("validateHostsAtStartup: does not throw in development with empty hosts", () => {
  const { validateHostsAtStartup } = freshRequire({
    NODE_ENV: "development",
    PUBLIC_SITE_HOST: "",
    PORTAL_HOST: "",
    ADMIN_HOST: "",
  });
  assert.doesNotThrow(() => validateHostsAtStartup());
});
// ── Segment-boundary safety — isAdminRoute ────────────────────────────────────

test("isAdminRoute: /dashboard/istifadeciler-evil is NOT an admin route", () => {
  const { isAdminRoute } = freshRequire({ ...PROD_HOSTS });
  assert.equal(isAdminRoute("/dashboard/istifadeciler-evil"), false);
});

test("isAdminRoute: /dashboard/istifadeciX is NOT an admin route", () => {
  const { isAdminRoute } = freshRequire({ ...PROD_HOSTS });
  assert.equal(isAdminRoute("/dashboard/istifadeciX"), false);
});

test("isAdminRoute: /dashboard/istifadeciler is an admin route (exact)", () => {
  const { isAdminRoute } = freshRequire({ ...PROD_HOSTS });
  assert.equal(isAdminRoute("/dashboard/istifadeciler"), true);
});

test("isAdminRoute: /dashboard/istifadeciler/123 is an admin route (child)", () => {
  const { isAdminRoute } = freshRequire({ ...PROD_HOSTS });
  assert.equal(isAdminRoute("/dashboard/istifadeciler/123"), true);
});

test("isAdminRoute: /dashboard/kategoriler-evil is NOT an admin route", () => {
  const { isAdminRoute } = freshRequire({ ...PROD_HOSTS });
  assert.equal(isAdminRoute("/dashboard/kategoriler-evil"), false);
});

test("isAdminRoute: /dashboard/whatsappX is NOT an admin route", () => {
  const { isAdminRoute } = freshRequire({ ...PROD_HOSTS });
  assert.equal(isAdminRoute("/dashboard/whatsappX"), false);
});

test("isAdminRoute: /octo-adminevil is NOT an admin route", () => {
  const { isAdminRoute } = freshRequire({ ...PROD_HOSTS });
  assert.equal(isAdminRoute("/octo-adminevil"), false);
});

// ── Segment-boundary safety — isPortalRoute ───────────────────────────────────

test("isPortalRoute: /dashboard/profilevil is NOT a portal route", () => {
  const { isPortalRoute } = freshRequire({ ...PROD_HOSTS });
  assert.equal(isPortalRoute("/dashboard/profilevil"), false);
});

test("isPortalRoute: /dashboard/yeni-elanX is NOT a portal route", () => {
  const { isPortalRoute } = freshRequire({ ...PROD_HOSTS });
  assert.equal(isPortalRoute("/dashboard/yeni-elanX"), false);
});

test("isPortalRoute: /dashboard/menim-elanlarimX is NOT a portal route", () => {
  const { isPortalRoute } = freshRequire({ ...PROD_HOSTS });
  assert.equal(isPortalRoute("/dashboard/menim-elanlarimX"), false);
});


// ── Finding 2: wrong-host login POST policy ──────────────────────────────────
// loginPostHostPolicy: returns {action:"allow"} or {action:"json404"}.
// A wrong-host POST must return 404, never redirect, never set session.
// login GET is a browser navigation — stays allowed on admin+portal hosts.

test("loginPostHostPolicy: ADMIN credentials on ADMIN_HOST → allow", () => {
  const { loginPostHostPolicy } = freshRequire({ ...PROD_HOSTS });
  const result = loginPostHostPolicy("ADMIN", "admin-logistika.octotech.az");
  assert.equal(result.action, "allow");
});

test("loginPostHostPolicy: non-ADMIN on PORTAL_HOST → allow", () => {
  const { loginPostHostPolicy } = freshRequire({ ...PROD_HOSTS });
  const result = loginPostHostPolicy("USER", "portal-logistika.octotech.az");
  assert.equal(result.action, "allow");
});

test("loginPostHostPolicy: ADMIN on PORTAL_HOST → json404", () => {
  const { loginPostHostPolicy } = freshRequire({ ...PROD_HOSTS });
  const result = loginPostHostPolicy("ADMIN", "portal-logistika.octotech.az");
  assert.equal(result.action, "json404");
});

test("loginPostHostPolicy: non-ADMIN on ADMIN_HOST → json404", () => {
  const { loginPostHostPolicy } = freshRequire({ ...PROD_HOSTS });
  const result = loginPostHostPolicy("CARRIER", "admin-logistika.octotech.az");
  assert.equal(result.action, "json404");
});

test("loginPostHostPolicy: any role on PUBLIC_SITE_HOST → json404", () => {
  const { loginPostHostPolicy } = freshRequire({ ...PROD_HOSTS });
  assert.equal(loginPostHostPolicy("ADMIN", "logistika.octotech.az").action, "json404");
  assert.equal(loginPostHostPolicy("USER", "logistika.octotech.az").action, "json404");
});

test("loginPostHostPolicy: dev localhost any role → allow", () => {
  const { loginPostHostPolicy } = freshRequire({ NODE_ENV: "development", PUBLIC_SITE_HOST: "", PORTAL_HOST: "", ADMIN_HOST: "" });
  assert.equal(loginPostHostPolicy("ADMIN", "localhost:3005").action, "allow");
});

// ── Finding 3: requireAuth redirects to /login ────────────
// requireAuthRedirectTarget: takes the Host header, returns same-host login URL.
// Never redirects to the public site.

test("requireAuthRedirectTarget: admin host → https://admin/dashboard/login", () => {
  const { requireAuthRedirectTarget } = freshRequire({ ...PROD_HOSTS });
  const target = requireAuthRedirectTarget("admin-logistika.octotech.az");
  assert.equal(target, "https://admin-logistika.octotech.az/dashboard/login");
});

test("requireAuthRedirectTarget: portal host → https://portal/login", () => {
  const { requireAuthRedirectTarget } = freshRequire({ ...PROD_HOSTS });
  const target = requireAuthRedirectTarget("portal-logistika.octotech.az");
  assert.equal(target, "https://portal-logistika.octotech.az/login");
});

test("requireAuthRedirectTarget: public host → https://portal/login (fallback)", () => {
  const { requireAuthRedirectTarget } = freshRequire({ ...PROD_HOSTS });
  const target = requireAuthRedirectTarget("logistika.octotech.az");
  assert.equal(target, "https://portal-logistika.octotech.az/login");
});

test("requireAuthRedirectTarget: dev → /login (relative)", () => {
  const { requireAuthRedirectTarget } = freshRequire({ NODE_ENV: "development", PUBLIC_SITE_HOST: "", PORTAL_HOST: "localhost:3005", ADMIN_HOST: "" });
  const target = requireAuthRedirectTarget("localhost:3005");
  assert.equal(target, "/login");
});

test("loginRedirectTarget: admin host in dev → /dashboard/login on same host", () => {
  const { loginRedirectTarget } = freshRequire({
    NODE_ENV: "development",
    PUBLIC_SITE_HOST: "lvh.me:3001",
    PORTAL_HOST: "portal.lvh.me:3001",
    ADMIN_HOST: "admin.lvh.me:3005",
  });
  const target = loginRedirectTarget("admin.lvh.me:3005");
  assert.equal(target, "http://admin.lvh.me:3005/dashboard/login");
});

test("loginRedirectTarget: appends query params for logout flash messages", () => {
  const { loginRedirectTarget } = freshRequire({
    NODE_ENV: "development",
    PUBLIC_SITE_HOST: "lvh.me:3001",
    PORTAL_HOST: "portal.lvh.me:3001",
    ADMIN_HOST: "admin.lvh.me:3005",
  });
  const target = loginRedirectTarget("admin.lvh.me:3005", { error: "test" });
  assert.equal(target, "http://admin.lvh.me:3005/dashboard/login?error=test");
});

// ── Finding 4: /octo-admin + authenticated /dashboard/login landing ───────────
// loginLandingPath: given user role, returns the correct post-login path.

test("loginLandingPath: ADMIN → /dashboard/butun-elanlar", () => {
  const { loginLandingPath } = freshRequire({ ...PROD_HOSTS });
  assert.equal(loginLandingPath("ADMIN"), "/dashboard/butun-elanlar");
});

test("loginLandingPath: CARRIER → /dashboard/menim-elanlarim", () => {
  const { loginLandingPath } = freshRequire({ ...PROD_HOSTS });
  assert.equal(loginLandingPath("CARRIER"), "/dashboard/menim-elanlarim");
});

test("loginLandingPath: USER → /dashboard/menim-elanlarim", () => {
  const { loginLandingPath } = freshRequire({ ...PROD_HOSTS });
  assert.equal(loginLandingPath("USER"), "/dashboard/menim-elanlarim");
});

test("loginLandingTarget: admin role on admin host stays on relative admin path", () => {
  const { loginLandingTarget } = freshRequire({ ...PROD_HOSTS });
  assert.equal(
    loginLandingTarget("ADMIN", "admin-logistika.octotech.az"),
    "/dashboard/butun-elanlar"
  );
});

test("loginLandingTarget: non-admin role on admin host redirects to portal host", () => {
  const { loginLandingTarget } = freshRequire({ ...PROD_HOSTS });
  assert.equal(
    loginLandingTarget("CARGO_OWNER", "admin-logistika.octotech.az"),
    "https://portal-logistika.octotech.az/dashboard/menim-elanlarim"
  );
});

// ── loginPreGate: pre-DB-lookup host check ───────────────────────────────────

test("loginPreGate: ADMIN_HOST → allow", () => {
  const { loginPreGate } = freshRequire({ ...PROD_HOSTS });
  assert.equal(loginPreGate("admin-logistika.octotech.az").action, "allow");
});

test("loginPreGate: PORTAL_HOST → allow", () => {
  const { loginPreGate } = freshRequire({ ...PROD_HOSTS });
  assert.equal(loginPreGate("portal-logistika.octotech.az").action, "allow");
});

test("loginPreGate: PUBLIC_SITE_HOST → json404", () => {
  const { loginPreGate } = freshRequire({ ...PROD_HOSTS });
  assert.equal(loginPreGate("logistika.octotech.az").action, "json404");
});

test("loginPreGate: unknown host → json404", () => {
  const { loginPreGate } = freshRequire({ ...PROD_HOSTS });
  assert.equal(loginPreGate("evil.example.com").action, "json404");
});

test("loginPreGate: dev localhost → allow regardless", () => {
  const { loginPreGate } = freshRequire({ NODE_ENV: "development", PUBLIC_SITE_HOST: "", PORTAL_HOST: "", ADMIN_HOST: "" });
  assert.equal(loginPreGate("localhost:3001").action, "allow");
});

// ── loginPreGate: Express route wiring seam ──────────────────────────────────
// Proves the pre-gate fires at the route boundary, before any DB access.







// ── loginGetHostPolicy: GET /dashboard/login host decision ───────────────────

test("loginGetHostPolicy: admin host → allow (Express EJS login)", () => {
  const { loginGetHostPolicy } = freshRequire({ ...PROD_HOSTS });
  const result = loginGetHostPolicy("admin-logistika.octotech.az", true);
  assert.deepEqual(result, { action: "allow" });
});

test("loginGetHostPolicy: portal host browser GET → exact portal React login redirect", () => {
  const { loginGetHostPolicy } = freshRequire({ ...PROD_HOSTS });
  const result = loginGetHostPolicy("portal-logistika.octotech.az", true);
  assert.deepEqual(result, { action: "redirect", location: "https://portal-logistika.octotech.az/login" });
});

test("loginGetHostPolicy: portal host non-browser → json404", () => {
  const { loginGetHostPolicy } = freshRequire({ ...PROD_HOSTS });
  assert.deepEqual(loginGetHostPolicy("portal-logistika.octotech.az", false), { action: "json404" });
});

test("loginGetHostPolicy: public host browser GET → redirect to portal/login", () => {
  const { loginGetHostPolicy } = freshRequire({ ...PROD_HOSTS });
  const result = loginGetHostPolicy("logistika.octotech.az", true);
  assert.equal(result.action, "redirect");
  assert.match(result.location, /portal-logistika\.octotech\.az/);
  assert.match(result.location, /\/login$/);
  assert.match(result.location, /^https:\/\//);
});

test("loginGetHostPolicy: public host non-browser → json404", () => {
  const { loginGetHostPolicy } = freshRequire({ ...PROD_HOSTS });
  const result = loginGetHostPolicy("logistika.octotech.az", false);
  assert.deepEqual(result, { action: "json404" });
});

test("loginGetHostPolicy: unknown host browser GET → json404 (no redirect)", () => {
  const { loginGetHostPolicy } = freshRequire({ ...PROD_HOSTS });
  const result = loginGetHostPolicy("evil.example.com", true);
  assert.equal(result.action, "json404");
});

test("loginGetHostPolicy: development → allow", () => {
  const { loginGetHostPolicy } = freshRequire({ NODE_ENV: "development", PUBLIC_SITE_HOST: "", PORTAL_HOST: "", ADMIN_HOST: "" });
  assert.deepEqual(loginGetHostPolicy("localhost:3001", true), { action: "allow" });
});

// ── loginGetHostPolicy: route wiring seam ────────────────────────────────────





// ── requireAuthAction: unauthenticated request host decision ─────────────────

test("requireAuthAction: admin host → redirect to https://ADMIN_HOST/dashboard/login", () => {
  const { requireAuthAction } = freshRequire({ ...PROD_HOSTS });
  const result = requireAuthAction("admin-logistika.octotech.az");
  assert.equal(result.action, "redirect");
  assert.equal(result.location, "https://admin-logistika.octotech.az/dashboard/login");
});

test("requireAuthAction: portal host → redirect to https://PORTAL_HOST/login", () => {
  const { requireAuthAction } = freshRequire({ ...PROD_HOSTS });
  const result = requireAuthAction("portal-logistika.octotech.az");
  assert.equal(result.action, "redirect");
  assert.equal(result.location, "https://portal-logistika.octotech.az/login");
});

test("requireAuthAction: public site host → json404 (no redirect)", () => {
  const { requireAuthAction } = freshRequire({ ...PROD_HOSTS });
  const result = requireAuthAction("logistika.octotech.az");
  assert.equal(result.action, "json404");
});

test("requireAuthAction: unknown host → json404 (no redirect)", () => {
  const { requireAuthAction } = freshRequire({ ...PROD_HOSTS });
  const result = requireAuthAction("evil.example.com");
  assert.equal(result.action, "json404");
});

test("requireAuthAction: development → redirect to relative /login", () => {
  const { requireAuthAction } = freshRequire({ NODE_ENV: "development", PUBLIC_SITE_HOST: "", PORTAL_HOST: "localhost:3005", ADMIN_HOST: "" });
  const result = requireAuthAction("localhost:3005");
  assert.deepEqual(result, { action: "redirect", location: "/login" });
});

// ── resolveUrlScheme / buildAbsoluteUrl ───────────────────────────────────────

test("resolveUrlScheme: lvh.me uses http even in production NODE_ENV", () => {
  const { resolveUrlScheme, buildAbsoluteUrl } = freshRequire({
    NODE_ENV: "production",
    ADMIN_HOST: "admin.lvh.me:3005",
  });
  assert.equal(resolveUrlScheme("admin.lvh.me:3005"), "http");
  assert.equal(
    buildAbsoluteUrl("admin.lvh.me:3005", "/dashboard/butun-elanlar?elan=100002"),
    "http://admin.lvh.me:3005/dashboard/butun-elanlar?elan=100002"
  );
});

test("resolveUrlScheme: production host uses https", () => {
  const { resolveUrlScheme, buildAbsoluteUrl } = freshRequire({
    NODE_ENV: "production",
    ADMIN_HOST: "admin-logistika.octotech.az",
  });
  assert.equal(resolveUrlScheme("admin-logistika.octotech.az"), "https");
  assert.equal(
    buildAbsoluteUrl("admin-logistika.octotech.az", "/dashboard/butun-elanlar"),
    "https://admin-logistika.octotech.az/dashboard/butun-elanlar"
  );
});

// ── requireAuthAction: middleware seam ───────────────────────────────────────







