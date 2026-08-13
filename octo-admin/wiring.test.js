"use strict";

/**
 * Production wiring tests for login and auth middleware.
 *
 * These tests invoke the EXACT production factory functions exported from
 * authHandlers.js and wired in index.js. They are NOT pure-policy unit tests —
 * they prove the production seam: that the exported factories produce
 * middleware that behaves correctly end-to-end with real req/res doubles and
 * a fake PostgreSQL-backed repository.
 *
 * Removing or renaming makeLoginPostHandler / makeLoginGetHandler /
 * makeRequireAuth from authHandlers.js will break these tests immediately.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const PROD_ENV = {
  NODE_ENV: "production",
  PUBLIC_SITE_HOST: "logistika.octotech.az",
  PORTAL_HOST: "portal-logistika.octotech.az",
  ADMIN_HOST: "admin-logistika.octotech.az",
  SESSION_SECRET: "test-secret-long-enough-for-production",
};

function freshAuthHandlers(vars) {
  // Clear both modules so env changes are picked up by hostConfig (which
  // authHandlers delegates to for all policy decisions).
  delete require.cache[require.resolve("./hostConfig.js")];
  delete require.cache[require.resolve("./authHandlers.js")];
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
  return require("./authHandlers.js");
}

// ── Exact production wiring assertions ───────────────────────────────────────
// These checks require the specific structural patterns that production index.js
// must contain. A substring match on the factory name alone is insufficient:
// an import without a call, or a call on a wrong source, must also fail.
//
// Mutant-source rule: if the registration line is removed but the import stays,
// the test must still fail. The helpers below enforce this by requiring BOTH the
// import from authHandlers AND the route/call registration.

function readIndexSrc() {
  const fs = require("fs");
  return fs.readFileSync(require.resolve("./index.js"), "utf8");
}

// Returns true if src contains a destructured require of name from authHandlers.
function hasAuthHandlersImport(src, name) {
  // Matches: { ..., makeXxx, ... } = require('./authHandlers') or require("./authHandlers")
  return /require\(["']\.\/authHandlers["']\)/.test(src) &&
    new RegExp("\\b" + name + "\\b").test(src);
}

// Returns true if src contains the exact route registration for path + factory call.
function hasRouteRegistration(src, method, routePath, factoryCall) {
  // e.g. app.get('/dashboard/login', makeLoginGetHandler())
  const escaped = routePath.replace(/\//g, "\\/");
  const pattern = new RegExp(
    "app\\." + method + "\\([\"']" + escaped + "[\"'],\\s*" + factoryCall
  );
  return pattern.test(src);
}

// Negative assertion: removing the registration line while leaving the import
// must still fail. We simulate this by checking the factory call independently.
function hasFactoryCall(src, factoryCall) {
  return new RegExp("\\b" + factoryCall).test(src);
}

test("wiring: index.js imports makeRequireAuth from authHandlers and calls it", () => {
  const src = readIndexSrc();
  assert.ok(
    hasAuthHandlersImport(src, "makeRequireAuth"),
    "index.js must import makeRequireAuth from ./authHandlers"
  );
  assert.ok(
    hasFactoryCall(src, "makeRequireAuth\\("),
    "index.js must call makeRequireAuth(...) to produce the requireAuth middleware"
  );
  // Mutant-source: a bare import without the assignment/call would fail the
  // hasFactoryCall check above. Verify the const assignment is present.
  assert.match(
    src,
    /const\s+requireAuth\s*=\s*makeRequireAuth\(\s*\{\s*userRepository\s*\}\s*\)/,
    "index.js must assign requireAuth using makeRequireAuth({ userRepository })"
  );
});

test("wiring: index.js registers app.get('/dashboard/login', makeLoginGetHandler()) from authHandlers", () => {
  const src = readIndexSrc();
  assert.ok(
    hasAuthHandlersImport(src, "makeLoginGetHandler"),
    "index.js must import makeLoginGetHandler from ./authHandlers"
  );
  assert.ok(
    hasRouteRegistration(src, "get", "/dashboard/login", "makeLoginGetHandler\\(\\)"),
    "index.js must register: app.get('/dashboard/login', makeLoginGetHandler())"
  );
  // Negative mutant: import present but route removed → hasRouteRegistration fails.
  // Verify the route registration independently from the import check.
  assert.match(
    src,
    /app\.get\(['"]\/dashboard\/login['"],\s*makeLoginGetHandler\(\)\)/,
    "route registration app.get('/dashboard/login', makeLoginGetHandler()) must be present"
  );
});

test("wiring: index.js registers app.post('/dashboard/login', makeLoginPostHandler(userRepository)) from authHandlers", () => {
  const src = readIndexSrc();
  assert.ok(
    hasAuthHandlersImport(src, "makeLoginPostHandler"),
    "index.js must import makeLoginPostHandler from ./authHandlers"
  );
  assert.ok(
    hasRouteRegistration(src, "post", "/dashboard/login", "makeLoginPostHandler\\(userRepository\\)"),
    "index.js must register: app.post('/dashboard/login', makeLoginPostHandler(userRepository))"
  );
  // Negative mutant: import present but route removed → hasRouteRegistration fails.
  assert.match(
    src,
    /app\.post\(['"]\/dashboard\/login['"],\s*makeLoginPostHandler\(userRepository\)\)/,
    "route registration app.post('/dashboard/login', makeLoginPostHandler(userRepository)) must be present"
  );
});

// ── POST /dashboard/login pre-gate: production handler wiring ────────────────

test("makeLoginPostHandler: public host → 404 before repository lookup, zero calls", (t, done) => {
  const { makeLoginPostHandler } = freshAuthHandlers(PROD_ENV);

  let dbCallCount = 0;
  const fakeRepository = {
    async findLoginUser() { dbCallCount++; return null; },
    async verifyPassword() { return false; },
  };

  const handler = makeLoginPostHandler(fakeRepository);

  const req = {
    get: (h) => h === "host" ? "logistika.octotech.az" : undefined,
    body: { email: "user@test.com", password: "pw" },
    session: {},
  };

  let statusCode = null;
  let jsonBody = null;
  let redirectCalled = false;
  const res = {
    status(c) { statusCode = c; return this; },
    json(b) { jsonBody = b; },
    redirect() { redirectCalled = true; },
    render() { throw new Error("must not render on public host"); },
    send() { throw new Error("must not send on public host"); },
    cookie() {},
  };

  Promise.resolve(handler(req, res, () => { throw new Error("must not call next"); }))
    .then(() => {
      assert.equal(statusCode, 404);
      assert.ok(jsonBody);
      assert.equal(dbCallCount, 0, "DB must not be called on public host");
      assert.equal(redirectCalled, false);
      assert.deepEqual(req.session, {}, "session must remain empty");
      done();
    })
    .catch(done);
});

test("makeLoginPostHandler: unknown host → 404 before DB lookup, zero DB calls", (t, done) => {
  const { makeLoginPostHandler } = freshAuthHandlers(PROD_ENV);

  let dbCallCount = 0;
  const fakeRepository = {
    async findLoginUser() { dbCallCount++; return null; },
    async verifyPassword() { return false; },
  };

  const handler = makeLoginPostHandler(fakeRepository);

  const req = {
    get: (h) => h === "host" ? "evil.example.com" : undefined,
    body: { email: "user@test.com", password: "pw" },
    session: {},
  };

  let statusCode = null;
  let redirectCalled = false;
  const res = {
    status(c) { statusCode = c; return this; },
    json() {},
    redirect() { redirectCalled = true; },
    render() { throw new Error("must not render"); },
    send() { throw new Error("must not send"); },
    cookie() {},
  };

  Promise.resolve(handler(req, res, () => { throw new Error("must not call next"); }))
    .then(() => {
      assert.equal(statusCode, 404);
      assert.equal(dbCallCount, 0, "DB must not be called on unknown host");
      assert.equal(redirectCalled, false);
      assert.deepEqual(req.session, {});
      done();
    })
    .catch(done);
});

test("makeLoginPostHandler: portal host + ADMIN role → DB called, loginPostHostPolicy blocks → 404 no session", (t, done) => {
  const bcrypt = require("bcryptjs");
  const { makeLoginPostHandler } = freshAuthHandlers(PROD_ENV);

  const plainPw = "testpw123";
  const hash = bcrypt.hashSync(plainPw, 10);
  const fakeUser = { id: 1, role: "ADMIN", email: "admin@test.com", name: "Admin", profile_picture: null, password: hash };

  let dbCallCount = 0;
  const fakeRepository = {
    async findLoginUser() { dbCallCount++; return fakeUser; },
    async verifyPassword(password, hash) { return bcrypt.compare(password, hash); },
  };

  const handler = makeLoginPostHandler(fakeRepository);

  const req = {
    get: (h) => h === "host" ? "portal-logistika.octotech.az" : undefined,
    body: { email: "admin@test.com", password: plainPw },
    session: { cookie: {} },
  };

  let statusCode = null;
  let jsonBody = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json(b) { jsonBody = b; },
    redirect() { throw new Error("must not redirect on wrong-role/wrong-host POST"); },
    render() { throw new Error("must not render"); },
    send() { throw new Error("must not send success HTML"); },
    cookie() {},
  };

  Promise.resolve(handler(req, res, () => { throw new Error("must not call next"); }))
    .then(() => {
      assert.equal(statusCode, 404, "ADMIN on portal host must get 404");
      assert.ok(jsonBody, "must return JSON body");
      assert.ok(dbCallCount >= 1, "DB was called (portal host passed pre-gate)");
      assert.equal(req.session.userId, undefined, "no session.userId must be set");
      done();
    })
    .catch(done);
});

// ── GET /dashboard/login: production handler wiring ──────────────────────────

test("makeLoginGetHandler: public host browser GET → redirect to portal login, no render", (t, done) => {
  const { makeLoginGetHandler } = freshAuthHandlers(PROD_ENV);
  const handler = makeLoginGetHandler();

  const req = {
    get: (h) => h === "host" ? "logistika.octotech.az" : undefined,
    method: "GET",
    path: "/dashboard/login",
    originalUrl: "/dashboard/login",
    accepts: (t) => t === "html",
    session: {},
  };

  let redirectedTo = null;
  let rendered = false;
  let statusCode = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json() {},
    redirect(url) { redirectedTo = url; },
    render() { rendered = true; },
  };

  Promise.resolve(handler(req, res, () => { throw new Error("must not call next"); }))
    .then(() => {
      assert.ok(redirectedTo, "must redirect, not return null");
      assert.match(redirectedTo, /^https:\/\/portal-logistika\.octotech\.az/);
      assert.match(redirectedTo, /\/login$/);
      assert.equal(rendered, false, "login page must not render on public host");
      assert.equal(statusCode, null, "no status code set on redirect");
      done();
    })
    .catch(done);
});

test("makeLoginGetHandler: unknown host browser GET → 404, no redirect", (t, done) => {
  const { makeLoginGetHandler } = freshAuthHandlers(PROD_ENV);
  const handler = makeLoginGetHandler();

  const req = {
    get: (h) => h === "host" ? "evil.example.com" : undefined,
    method: "GET",
    path: "/dashboard/login",
    originalUrl: "/dashboard/login",
    accepts: (t) => t === "html",
    session: {},
  };

  let statusCode = null;
  let redirectedTo = null;
  let rendered = false;
  const res = {
    status(c) { statusCode = c; return this; },
    json() {},
    redirect(url) { redirectedTo = url; },
    render() { rendered = true; },
  };

  Promise.resolve(handler(req, res, () => { throw new Error("must not call next"); }))
    .then(() => {
      assert.equal(statusCode, 404);
      assert.equal(redirectedTo, null, "must not redirect on unknown host");
      assert.equal(rendered, false);
      done();
    })
    .catch(done);
});

test("makeLoginGetHandler: admin host → serve login page (allow)", (t, done) => {
  const { makeLoginGetHandler } = freshAuthHandlers(PROD_ENV);
  const handler = makeLoginGetHandler();

  const req = {
    get: (h) => h === "host" ? "admin-logistika.octotech.az" : undefined,
    method: "GET",
    path: "/dashboard/login",
    originalUrl: "/dashboard/login",
    accepts: (t) => t === "html",
    session: {},
  };

  let rendered = null;
  let redirectedTo = null;
  const res = {
    status() { return this; },
    json() {},
    redirect(url) { redirectedTo = url; },
    render(view) { rendered = view; },
  };

  Promise.resolve(handler(req, res, () => { throw new Error("must not call next"); }))
    .then(() => {
      assert.equal(rendered, "login", "admin host must render login page");
      assert.equal(redirectedTo, null);
      done();
    })
    .catch(done);
});

// ── requireAuth: production middleware wiring ────────────────────────────────

test("makeRequireAuth: admin host unauthenticated → redirect to https://ADMIN_HOST/dashboard/login", () => {
  const { makeRequireAuth } = freshAuthHandlers(PROD_ENV);
  const requireAuth = makeRequireAuth();

  const req = {
    get: (h) => h === "host" ? "admin-logistika.octotech.az" : undefined,
    session: {},
  };

  let redirectedTo = null;
  let statusCode = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json() {},
    redirect(url) { redirectedTo = url; },
  };

  requireAuth(req, res, () => { throw new Error("must not call next for unauthenticated"); });

  assert.ok(redirectedTo, "must redirect unauthenticated admin-host request");
  assert.match(redirectedTo, /admin-logistika\.octotech\.az\/dashboard\/login/);
  assert.match(redirectedTo, /^https:\/\//);
  assert.equal(statusCode, null);
});

test("makeRequireAuth: public host unauthenticated → 404, no redirect to portal", () => {
  const { makeRequireAuth } = freshAuthHandlers(PROD_ENV);
  const requireAuth = makeRequireAuth();

  const req = {
    get: (h) => h === "host" ? "logistika.octotech.az" : undefined,
    session: {},
  };

  let statusCode = null;
  let redirectedTo = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json() {},
    redirect(url) { redirectedTo = url; },
  };

  requireAuth(req, res, () => { throw new Error("must not call next for unauthenticated"); });

  assert.equal(statusCode, 404);
  assert.equal(redirectedTo, null, "must NOT redirect public host to portal login");
});

test("makeRequireAuth: unknown host unauthenticated → 404, no redirect", () => {
  const { makeRequireAuth } = freshAuthHandlers(PROD_ENV);
  const requireAuth = makeRequireAuth();

  const req = {
    get: (h) => h === "host" ? "evil.example.com" : undefined,
    session: {},
  };

  let statusCode = null;
  let redirectedTo = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json() {},
    redirect(url) { redirectedTo = url; },
  };

  requireAuth(req, res, () => { throw new Error("must not call next for unauthenticated"); });

  assert.equal(statusCode, 404);
  assert.equal(redirectedTo, null, "must NOT redirect unknown host");
});

test("makeRequireAuth: authenticated on any host → next() called, no redirect, no 404", () => {
  const { makeRequireAuth } = freshAuthHandlers(PROD_ENV);
  const requireAuth = makeRequireAuth();

  const req = {
    get: (h) => h === "host" ? "logistika.octotech.az" : undefined,
    session: { userId: 42 },
  };

  let nextCalled = false;
  let statusCode = null;
  let redirectedTo = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json() {},
    redirect(url) { redirectedTo = url; },
  };

  requireAuth(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true, "authenticated request must call next()");
  assert.equal(statusCode, null);
  assert.equal(redirectedTo, null);
});

test("makeRequireAuth: portal host unauthenticated → redirect to portal login", () => {
  const { makeRequireAuth } = freshAuthHandlers(PROD_ENV);
  const requireAuth = makeRequireAuth();

  const req = {
    get: (h) => h === "host" ? "portal-logistika.octotech.az" : undefined,
    session: {},
  };

  let redirectedTo = null;
  const res = {
    status() { return this; },
    json() {},
    redirect(url) { redirectedTo = url; },
  };

  requireAuth(req, res, () => { throw new Error("must not call next"); });

  assert.ok(redirectedTo, "must redirect unauthenticated portal-host request");
  assert.match(redirectedTo, /portal-logistika\.octotech\.az\/login/);
  assert.match(redirectedTo, /^https:\/\//);
});

// ── Auth cleanup: no localStorage writes, no octo_user_data cookie ───────────

test("makeLoginPostHandler: successful login → redirect, no cookie, no send with script", (t, done) => {
  const bcrypt = require("bcryptjs");
  const { makeLoginPostHandler } = freshAuthHandlers(PROD_ENV);

  const plainPw = "testpw123";
  const hash = bcrypt.hashSync(plainPw, 10);
  const fakeUser = { id: 5, role: "USER", email: "user@portal.com", name: "Test", profile_picture: null, password: hash };

  const fakeRepository = {
    async findLoginUser() { return fakeUser; },
    async verifyPassword(password, hash) { return bcrypt.compare(password, hash); },
  };

  const handler = makeLoginPostHandler(fakeRepository);

  const req = {
    get: (h) => h === "host" ? "portal-logistika.octotech.az" : undefined,
    body: { email: "user@portal.com", password: plainPw },
    session: { cookie: {} },
  };

  let redirectedTo = null;
  let cookieCalled = false;
  let sentBody = null;
  const res = {
    status() { return this; },
    json() {},
    redirect(url) { redirectedTo = url; },
    cookie() { cookieCalled = true; },
    send(body) { sentBody = body; },
    render() { throw new Error("must not render on success"); },
  };

  Promise.resolve(handler(req, res))
    .then(() => {
      assert.ok(redirectedTo, "must redirect on successful login");
      assert.equal(cookieCalled, false, "must NOT set octo_user_data cookie");
      assert.equal(sentBody, null, "must NOT send HTML with localStorage script");
      assert.equal(req.session.userId, fakeUser.id, "session.userId must be set");
      assert.deepEqual(req.session.user, { id: fakeUser.id, email: fakeUser.email, name: fakeUser.name, role: fakeUser.role });
      done();
    })
    .catch(done);
});

test("wiring: index.js logout destroys session, clears azlog_token, redirects via loginRedirectTarget", () => {
  const src = readIndexSrc();
  // Must use destroy with a callback
  assert.match(src, /req\.session\.destroy\s*\(\s*\(\s*\)\s*=>/, "logout must call session.destroy with arrow-fn callback");
  const logoutBlock = src.slice(src.indexOf("dashboard/logout"), src.indexOf("dashboard/logout") + 500);
  assert.match(logoutBlock, /loginRedirectTarget\s*\(/, "logout must redirect via loginRedirectTarget");
  assert.match(logoutBlock, /clearCookie\s*\(\s*['"]azlog_token['"]/, "logout must clear Next JWT cookie");
  assert.ok(!logoutBlock.includes("octo_user_data"), "logout must not touch legacy octo_user_data cookie");
  // Must NOT send an HTML script block in logout
  assert.ok(
    !src.match(/\/dashboard\/logout[\s\S]{0,300}localStorage/),
    "logout must not write localStorage"
  );
});

test("wiring: footer.ejs must not contain octo_admin_user localStorage writes", () => {
  const fs = require("fs");
  const footerSrc = fs.readFileSync(
    require("path").join(__dirname, "views/partials/footer.ejs"),
    "utf8"
  );
  assert.ok(
    !footerSrc.includes("octo_admin_user"),
    "footer.ejs must not reference octo_admin_user"
  );
  assert.ok(
    !footerSrc.includes("localStorage.setItem"),
    "footer.ejs must not call localStorage.setItem"
  );
  assert.ok(
    !footerSrc.includes("localStorage.removeItem"),
    "footer.ejs must not call localStorage.removeItem"
  );
});
