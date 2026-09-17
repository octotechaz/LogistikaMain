"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");

// ── Helper: extract handler block by route definition ─────────────────────────
function extractHandlerBlock(routePath) {
  const routePattern = new RegExp(
    `app\\.(?:get|post)\\(\\s*'${routePath.replace(/\//g, "\\/").replace(/:/g, "\\:")}'`
  );
  const lineStart = src.search(routePattern);
  if (lineStart === -1) return null;

  const asyncIdx = src.indexOf("async (req, res) =>", lineStart);
  // non-async handler: arrow function without async
  const arrowIdx = src.indexOf("(req, res) =>", lineStart);
  const callbackIdx = Math.min(
    asyncIdx !== -1 ? asyncIdx : Infinity,
    arrowIdx !== -1 ? arrowIdx : Infinity
  );
  if (callbackIdx === Infinity) return null;

  const braceIdx = src.indexOf("{", callbackIdx);
  if (braceIdx === -1) return null;

  let depth = 0;
  let i = braceIdx;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  return src.slice(braceIdx, i + 1);
}

// ── 1. userRepository is imported and instantiated ───────────────────────────

test("index.js: imports makeUserRepository from postgresUserRepository", () => {
  assert.ok(
    src.includes("require('./postgresUserRepository')") ||
    src.includes('require("./postgresUserRepository")'),
    "must require('./postgresUserRepository')"
  );
  assert.ok(src.includes("makeUserRepository"), "must destructure makeUserRepository");
});

test("index.js: creates userRepository instance with prisma", () => {
  assert.ok(
    src.includes("makeUserRepository(prisma)"),
    "must call makeUserRepository(prisma)"
  );
});

// ── 2. GET /dashboard/session-user ───────────────────────────────────────────

test("GET /dashboard/session-user: handler block is present", () => {
  const block = extractHandlerBlock("/dashboard/session-user");
  assert.ok(block, "handler block must be found");
});

test("GET /dashboard/session-user: uses userRepository.findSessionUser", () => {
  const block = extractHandlerBlock("/dashboard/session-user");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("userRepository.findSessionUser"),
    "must call userRepository.findSessionUser"
  );
});

test("GET /dashboard/session-user: passes req.session.userId to findSessionUser", () => {
  const block = extractHandlerBlock("/dashboard/session-user");
  assert.ok(block.includes("req.session.userId"), "must pass req.session.userId");
});

test("GET /dashboard/session-user: no db.prepare for users table in handler", () => {
  const block = extractHandlerBlock("/dashboard/session-user");
  assert.ok(block, "handler block must be found");
  const hasUsersPrepare = block.includes("db.prepare") &&
    (block.includes("users") || block.includes("FROM users") || block.includes("SELECT"));
  assert.ok(!hasUsersPrepare, "must not use db.prepare for users queries");
});

test("GET /dashboard/session-user: returns JSON with user object", () => {
  const block = extractHandlerBlock("/dashboard/session-user");
  assert.ok(block.includes("res.json"), "must respond with JSON");
  assert.ok(block.includes("user"), "JSON response must include 'user'");
});

test("GET /dashboard/session-user: returns 404 with { user: null } when user not found", () => {
  const block = extractHandlerBlock("/dashboard/session-user");
  assert.ok(
    block.includes("404") || block.includes("status(404)"),
    "must return 404 when user not found"
  );
  assert.ok(block.includes("user: null") || block.includes('"user"') || block.includes("null"), "must return null user");
});

test("GET /dashboard/session-user: awaits findSessionUser (async handler)", () => {
  const block = extractHandlerBlock("/dashboard/session-user");
  assert.ok(
    block.includes("await") && block.includes("userRepository.findSessionUser"),
    "must await userRepository.findSessionUser"
  );
});

// ── 3. GET /dashboard/istifadeciler ──────────────────────────────────────────

test("GET /dashboard/istifadeciler: handler block is present", () => {
  const block = extractHandlerBlock("/dashboard/istifadeciler");
  assert.ok(block, "handler block must be found");
});

test("GET /dashboard/istifadeciler: uses userRepository.listUsers", () => {
  const block = extractHandlerBlock("/dashboard/istifadeciler");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("userRepository.listUsers"),
    "must call userRepository.listUsers"
  );
});

test("GET /dashboard/istifadeciler: awaits listUsers", () => {
  const block = extractHandlerBlock("/dashboard/istifadeciler");
  assert.ok(
    block.includes("await") && block.includes("userRepository.listUsers"),
    "must await userRepository.listUsers"
  );
});

test("GET /dashboard/istifadeciler: no db.prepare for users table in handler", () => {
  const block = extractHandlerBlock("/dashboard/istifadeciler");
  assert.ok(block, "handler block must be found");
  const hasUsersPrepare = block.includes("db.prepare") &&
    (block.includes("users") || block.includes("FROM users"));
  assert.ok(!hasUsersPrepare, "must not use db.prepare for users queries");
});

test("GET /dashboard/istifadeciler: renders admin-istifadeciler with users", () => {
  const block = extractHandlerBlock("/dashboard/istifadeciler");
  assert.ok(block.includes("admin-istifadeciler"), "must render admin-istifadeciler template");
  assert.ok(block.includes("users"), "must pass users to template");
});

// ── 4. POST /dashboard/istifadeci/yarat ──────────────────────────────────────

test("POST /dashboard/istifadeci/yarat: handler block is present", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/yarat");
  assert.ok(block, "handler block must be found");
});

test("POST /dashboard/istifadeci/yarat: uses userRepository.findIdentityConflict for duplicate check", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/yarat");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("userRepository.findIdentityConflict"),
    "must call userRepository.findIdentityConflict to check duplicates"
  );
});

test("POST /dashboard/istifadeci/yarat: uses userRepository.createLegacyUser to create user", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/yarat");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("userRepository.createLegacyUser"),
    "must call userRepository.createLegacyUser"
  );
});

test("POST /dashboard/istifadeci/yarat: no db.prepare for users table in handler", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/yarat");
  assert.ok(block, "handler block must be found");
  const hasUsersPrepare = block.includes("db.prepare") &&
    (block.includes("users") || block.includes("FROM users") || block.includes("INSERT INTO users"));
  assert.ok(!hasUsersPrepare, "must not use db.prepare for users queries");
});

test("POST /dashboard/istifadeci/yarat: OTP verify fetch occurs before createLegacyUser", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/yarat");
  assert.ok(block, "handler block must be found");
  const otpIdx = block.indexOf("verify-otp");
  const createIdx = block.indexOf("userRepository.createLegacyUser");
  assert.ok(otpIdx !== -1, "must call OTP verify endpoint");
  assert.ok(createIdx !== -1, "must call userRepository.createLegacyUser");
  assert.ok(otpIdx < createIdx, "OTP verify must happen before createLegacyUser");
});

test("POST /dashboard/istifadeci/yarat: awaits createLegacyUser", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/yarat");
  assert.ok(
    block.includes("await") && block.includes("userRepository.createLegacyUser"),
    "must await userRepository.createLegacyUser"
  );
});

test("POST /dashboard/istifadeci/yarat: responds with success JSON on success", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/yarat");
  assert.ok(block.includes("success: true") || block.includes('"success"'), "must respond with success JSON");
});

// ── 5. POST /dashboard/istifadeci/sil/:id ────────────────────────────────────

test("POST /dashboard/istifadeci/sil/:id: handler block is present", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/sil/:id");
  assert.ok(block, "handler block must be found");
});

test("POST /dashboard/istifadeci/sil/:id: uses userRepository.deleteUserWithCargos", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/sil/:id");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("userRepository.deleteUserWithCargos"),
    "must call userRepository.deleteUserWithCargos"
  );
});

test("POST /dashboard/istifadeci/sil/:id: passes req.params.id to deleteUserWithCargos", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/sil/:id");
  assert.ok(block.includes("req.params.id"), "must pass req.params.id");
});

test("POST /dashboard/istifadeci/sil/:id: awaits deleteUserWithCargos", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/sil/:id");
  assert.ok(
    block.includes("await") && block.includes("userRepository.deleteUserWithCargos"),
    "must await userRepository.deleteUserWithCargos"
  );
});

test("POST /dashboard/istifadeci/sil/:id: self-delete guard uses string comparison (not parseInt)", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/sil/:id");
  assert.ok(block, "handler block must be found");
  // The guard must compare canonical string IDs, not parseInt
  assert.ok(
    !block.includes("parseInt(req.params.id)"),
    "self-delete guard must NOT use parseInt(req.params.id) — must compare canonical string IDs"
  );
  // Must still compare req.params.id against session userId
  assert.ok(block.includes("req.params.id"), "must reference req.params.id");
  assert.ok(block.includes("req.session.userId"), "must reference req.session.userId for self-delete guard");
});

test("POST /dashboard/istifadeci/sil/:id: redirects to /dashboard/istifadeciler on self-delete attempt", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/sil/:id");
  assert.ok(
    block.includes("/dashboard/istifadeciler"),
    "must redirect to /dashboard/istifadeciler"
  );
  assert.ok(block.includes("self_delete") || block.includes("error=self_delete"), "must include self_delete error in redirect");
});

test("POST /dashboard/istifadeci/sil/:id: redirects to /dashboard/istifadeciler?deleted=true on success", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/sil/:id");
  assert.ok(
    block.includes("deleted=true"),
    "must redirect with deleted=true query param on success"
  );
});

test("POST /dashboard/istifadeci/sil/:id: no db.prepare for users or cargos table in handler", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/sil/:id");
  assert.ok(block, "handler block must be found");
  const hasUsersPrepare = block.includes("db.prepare") &&
    (block.includes("users") || block.includes("cargos") || block.includes("DELETE FROM"));
  assert.ok(!hasUsersPrepare, "must not use db.prepare for users or cargos queries");
});

// ── 6. POST /dashboard/istifadeci/rol/:id ────────────────────────────────────

test("POST /dashboard/istifadeci/rol/:id: handler block is present", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/rol/:id");
  assert.ok(block, "handler block must be found");
});

test("POST /dashboard/istifadeci/rol/:id: uses userRepository.updateLegacyRole", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/rol/:id");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("userRepository.updateLegacyRole"),
    "must call userRepository.updateLegacyRole"
  );
});

test("POST /dashboard/istifadeci/rol/:id: passes req.params.id and req.body.role to updateLegacyRole", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/rol/:id");
  assert.ok(block.includes("req.params.id"), "must pass req.params.id");
  assert.ok(block.includes("req.body.role") || block.includes("role"), "must pass role from req.body");
});

test("POST /dashboard/istifadeci/rol/:id: awaits updateLegacyRole", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/rol/:id");
  assert.ok(
    block.includes("await") && block.includes("userRepository.updateLegacyRole"),
    "must await userRepository.updateLegacyRole"
  );
});

test("POST /dashboard/istifadeci/rol/:id: self-role guard uses string comparison (not parseInt)", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/rol/:id");
  assert.ok(block, "handler block must be found");
  assert.ok(
    !block.includes("parseInt(req.params.id)"),
    "self-role guard must NOT use parseInt(req.params.id) — must compare canonical string IDs"
  );
  assert.ok(block.includes("req.params.id"), "must reference req.params.id");
  assert.ok(block.includes("req.session.userId"), "must reference req.session.userId for self-role guard");
});

test("POST /dashboard/istifadeci/rol/:id: redirects to /dashboard/istifadeciler on self-role attempt", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/rol/:id");
  assert.ok(
    block.includes("/dashboard/istifadeciler"),
    "must redirect to /dashboard/istifadeciler"
  );
  assert.ok(block.includes("self_role") || block.includes("error=self_role"), "must include self_role error in redirect");
});

test("POST /dashboard/istifadeci/rol/:id: redirects to /dashboard/istifadeciler?updated=true on success", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/rol/:id");
  assert.ok(
    block.includes("updated=true"),
    "must redirect with updated=true query param on success"
  );
});

test("POST /dashboard/istifadeci/rol/:id: no db.prepare for users table in handler", () => {
  const block = extractHandlerBlock("/dashboard/istifadeci/rol/:id");
  assert.ok(block, "handler block must be found");
  const hasUsersPrepare = block.includes("db.prepare") &&
    (block.includes("users") || block.includes("UPDATE users"));
  assert.ok(!hasUsersPrepare, "must not use db.prepare for users queries");
});

// ── 7. No db.prepare touching users/cargos in these 5 handlers ───────────────

test("index.js: none of the 5 user route handlers use db.prepare for users/cargos", () => {
  const routes = [
    "/dashboard/session-user",
    "/dashboard/istifadeciler",
    "/dashboard/istifadeci/yarat",
    "/dashboard/istifadeci/sil/:id",
    "/dashboard/istifadeci/rol/:id",
  ];
  for (const route of routes) {
    const block = extractHandlerBlock(route);
    if (!block) continue;
    const hasViolation = block.includes("db.prepare") &&
      (block.includes("users") || block.includes("cargos") ||
       block.includes("FROM users") || block.includes("INTO users") ||
       block.includes("UPDATE users"));
    assert.ok(!hasViolation, `Route ${route} must not contain db.prepare for users/cargos tables`);
  }
});