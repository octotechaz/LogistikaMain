"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// Helper: fresh require both modules together (env vars must be set before require)
function freshRequireHandlers(vars) {
  const hcKey = require.resolve("./hostConfig.js");
  const ahKey = require.resolve("./authHandlers.js");
  delete require.cache[hcKey];
  delete require.cache[ahKey];
  Object.assign(process.env, vars);
  return require("./authHandlers.js");
}

const PROD_HOSTS = {
  NODE_ENV: "production",
  PUBLIC_SITE_HOST: "logistika.octotech.az",
  PORTAL_HOST: "portal-logistika.octotech.az",
  ADMIN_HOST: "admin-logistika.octotech.az",
  SESSION_SECRET: "test-secret-long-enough-for-production",
};

// ── makeRequireAuth ──────────────────────────────────────────────────────────

test("makeRequireAuth: unauthenticated request with req.hostname=ADMIN_HOST redirects to admin /auth", () => {
  const { makeRequireAuth } = freshRequireHandlers({ ...PROD_HOSTS });
  const requireAuth = makeRequireAuth();

  const req = {
    session: {},
    get: (h) => (h === "host" ? "127.0.0.1:3005" : undefined),
    hostname: "admin-logistika.octotech.az",
  };

  let redirectTarget = null;
  let status404Called = false;
  const res = {
    redirect(url) {
      redirectTarget = url;
    },
    status(c) {
      status404Called = c === 404;
      return { json() {} };
    },
  };

  requireAuth(req, res, () => {
    throw new Error("should not call next for unauthenticated request");
  });

  assert.ok(redirectTarget, "should redirect, not 404. Got status404=" + status404Called);
  assert.match(redirectTarget, /admin-logistika\.octotech\.az/, "redirect must target ADMIN_HOST");
  assert.match(redirectTarget, /\/auth$/, "redirect must go to /auth");
  assert.match(redirectTarget, /^https:\/\//, "redirect must use https in production");
});

test("makeRequireAuth: authenticated request calls next()", () => {
  const { makeRequireAuth } = freshRequireHandlers({ ...PROD_HOSTS });
  const requireAuth = makeRequireAuth();

  const req = {
    session: { userId: 42 },
    get: (h) => (h === "host" ? "admin-logistika.octotech.az" : undefined),
    hostname: "admin-logistika.octotech.az",
  };
  let nextCalled = false;
  requireAuth(req, {}, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});

test("makeRequireAuth: unauthenticated on unknown host → 404 (fail closed)", () => {
  const { makeRequireAuth } = freshRequireHandlers({ ...PROD_HOSTS });
  const requireAuth = makeRequireAuth();

  const req = {
    session: {},
    get: (h) => (h === "host" ? "evil.example.com" : undefined),
    hostname: "evil.example.com",
  };
  let statusCode = null;
  const res = {
    status(c) {
      statusCode = c;
      return { json() {} };
    },
    redirect() {
      throw new Error("should not redirect on unknown host");
    },
  };
  requireAuth(req, res, () => {});
  assert.equal(statusCode, 404);
});

// ── makeLoginGetHandler ──────────────────────────────────────────────────────

test("makeLoginGetHandler: ADMIN_HOST → render login page", () => {
  const { makeLoginGetHandler } = freshRequireHandlers({ ...PROD_HOSTS });
  const handler = makeLoginGetHandler();

  const req = {
    session: {},
    get: (h) => {
      if (h === "host") return "127.0.0.1:3005";
      if (h === "accept") return "text/html,application/xhtml+xml";
      return undefined;
    },
    hostname: "admin-logistika.octotech.az",
    method: "GET",
    path: "/dashboard/login",
    originalUrl: "/dashboard/login",
    url: "/dashboard/login",
    accepts: (t) => (t === "html" ? "html" : false),
  };

  let rendered = null;
  let redirectTarget = null;
  const res = {
    render(view, locals) {
      rendered = { view, locals };
    },
    redirect(url) {
      redirectTarget = url;
    },
    status() {
      return { json() {} };
    },
  };

  handler(req, res, () => {});

  assert.equal(redirectTarget, null, "admin host must not redirect away from Express login");
  assert.equal(rendered?.view, "login");
});

test("makeLoginGetHandler: portal dashboard login redirects to portal React login", () => {
  const { makeLoginGetHandler } = freshRequireHandlers({ ...PROD_HOSTS });
  const req = {
    session: {},
    hostname: "portal-logistika.octotech.az",
    method: "GET",
    get: () => "text/html",
    accepts: () => "html",
  };
  let target = null;
  makeLoginGetHandler()(req, {
    redirect: (url) => {
      target = url;
    },
    render() {},
    status() {
      return { json() {} };
    },
  });
  assert.equal(target, "https://portal-logistika.octotech.az/login");
});

test("makeLoginGetHandler: authenticated non-admin on admin host redirects to portal dashboard", () => {
  const { makeLoginGetHandler } = freshRequireHandlers({ ...PROD_HOSTS });
  const handler = makeLoginGetHandler();

  const req = {
    session: { userId: "user-1", user: { role: "CARGO_OWNER" } },
    get: (h) => {
      if (h === "host") return "admin-logistika.octotech.az";
      if (h === "accept") return "text/html";
      return undefined;
    },
    hostname: "admin-logistika.octotech.az",
    method: "GET",
    path: "/dashboard/login",
    originalUrl: "/dashboard/login",
    url: "/dashboard/login",
    accepts: (t) => (t === "html" ? "html" : false),
  };

  let redirectTarget = null;
  handler(req, {
    redirect(url) {
      redirectTarget = url;
    },
    render() {
      throw new Error("should not render login for authenticated user");
    },
    status() {
      return { json() {} };
    },
  });

  assert.equal(
    redirectTarget,
    "https://portal-logistika.octotech.az/dashboard/menim-elanlarim"
  );
});

// ── makeLoginPostHandler ─────────────────────────────────────────────────────

test("makeLoginPostHandler: ADMIN credentials on ADMIN_HOST → session + landing redirect", async () => {
  const { makeLoginPostHandler } = freshRequireHandlers({ ...PROD_HOSTS });

  const repository = {
    async findLoginUser(id) {
      assert.equal(id, "admin@tranzit.az");
      return {
        id: "admin-1",
        email: "admin@tranzit.az",
        name: "Admin",
        role: "ADMIN",
        password: "hash",
      };
    },
    async verifyPassword(password, hash) {
      return password === "Password123!" && hash === "hash";
    },
  };
  const handler = makeLoginPostHandler(repository);

  let redirectTarget = null;
  const req = {
    body: { email: "admin@tranzit.az", password: "Password123!" },
    hostname: "admin-logistika.octotech.az",
    get: () => undefined,
    session: { cookie: {} },
  };
  const res = {
    cookie() {},
    redirect(url) {
      redirectTarget = url;
    },
    status() {
      return { json() {} };
    },
    render() {
      throw new Error("should not render error on success");
    },
  };

  await handler(req, res);

  assert.equal(req.session.userId, "admin-1");
  assert.equal(req.session.user.role, "ADMIN");
  assert.equal(redirectTarget, "/dashboard/butun-elanlar");
});

test("makeLoginPostHandler: wrong password → render login error", async () => {
  const { makeLoginPostHandler } = freshRequireHandlers({ ...PROD_HOSTS });
  const handler = makeLoginPostHandler({
    async findLoginUser() {
      return { id: "1", email: "a@b.com", name: "A", role: "ADMIN", password: "hash" };
    },
    async verifyPassword() {
      return false;
    },
  });

  let rendered = null;
  await handler(
    {
      body: { email: "a@b.com", password: "bad" },
      hostname: "admin-logistika.octotech.az",
      get: () => undefined,
      session: { cookie: {} },
    },
    {
      redirect() {
        throw new Error("should not redirect");
      },
      render(view, locals) {
        rendered = { view, locals };
      },
      status() {
        return { json() {} };
      },
    }
  );

  assert.equal(rendered?.view, "login");
  assert.match(String(rendered?.locals?.error || ""), /yanlış/i);
});

test("makeLoginPostHandler: adminOnly rejects phone identifier without DB lookup", async () => {
  let lookups = 0;
  const { makeLoginPostHandler } = freshRequireHandlers({ ...PROD_HOSTS });
  const handler = makeLoginPostHandler(
    {
      async findLoginUser() {
        lookups += 1;
        throw new Error("must not look up phone on admin login");
      },
      async verifyPassword() {
        return false;
      },
    },
    { adminOnly: true }
  );

  let rendered = null;
  await handler(
    {
      body: { identifier: "501234567", countryCode: "994", password: "Password123!" },
      hostname: "admin-logistika.octotech.az",
      get: () => undefined,
      session: { cookie: {} },
    },
    {
      redirect() {
        throw new Error("should not redirect");
      },
      render(view, locals) {
        rendered = { view, locals };
      },
      status() {
        return { json() {} };
      },
    }
  );

  assert.equal(lookups, 0);
  assert.equal(rendered?.view, "login");
  assert.match(String(rendered?.locals?.error || ""), /E-poçt/);
});
