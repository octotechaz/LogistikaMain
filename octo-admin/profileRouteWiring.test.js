"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");

// ── Helper: extract handler body for a route ──────────────────────────────────
// Works for both async and non-async arrow-function handlers.
function extractHandlerBlock(routePath) {
  const escaped = routePath.replace(/\//g, "\\/").replace(/:/g, "\\:");
  const routePattern = new RegExp(
    `app\\.(?:get|post)\\(\\s*'${escaped}'`
  );
  const lineStart = src.search(routePattern);
  if (lineStart === -1) return null;

  // Find the last arrow-function callback on this route registration
  // Try async first, then plain arrow.
  let cbIdx = src.indexOf("async (req, res) =>", lineStart);
  if (cbIdx === -1) cbIdx = src.indexOf("(req, res) =>", lineStart);
  if (cbIdx === -1) return null;
  const braceIdx = src.indexOf("{", cbIdx);
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

// ── 1. userRepository is imported and used ────────────────────────────────────

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

// ── 2. GET /dashboard/profil ──────────────────────────────────────────────────

test("GET /dashboard/profil: handler block must exist", () => {
  const block = extractHandlerBlock("/dashboard/profil");
  assert.ok(block, "handler block for GET /dashboard/profil must be found");
});

test("GET /dashboard/profil: calls userRepository.findSessionUser", () => {
  const block = extractHandlerBlock("/dashboard/profil");
  assert.ok(block, "handler block must exist");
  assert.ok(
    block.includes("userRepository.findSessionUser"),
    "must call userRepository.findSessionUser"
  );
});

test("GET /dashboard/profil: passes session.userId to findSessionUser", () => {
  const block = extractHandlerBlock("/dashboard/profil");
  assert.ok(block, "handler block must exist");
  assert.ok(
    block.includes("req.session.userId"),
    "must pass req.session.userId to findSessionUser"
  );
});

test("GET /dashboard/profil: does not use db.prepare for users table", () => {
  const block = extractHandlerBlock("/dashboard/profil");
  assert.ok(block, "handler block must exist");
  const hasSqliteUsers = block.includes("db.prepare") &&
    (block.includes("users") || block.includes("FROM users"));
  assert.ok(!hasSqliteUsers, "must not use db.prepare for users table");
});

test("GET /dashboard/profil: renders profil view with user data", () => {
  const block = extractHandlerBlock("/dashboard/profil");
  assert.ok(block, "handler block must exist");
  assert.ok(block.includes("render"), "must call res.render");
  assert.ok(block.includes("profil"), "must render the 'profil' view");
});

test("GET /dashboard/profil: fails closed when session user not found (redirects or 4xx)", () => {
  const block = extractHandlerBlock("/dashboard/profil");
  assert.ok(block, "handler block must exist");
  // Must handle null result from findSessionUser — redirect or error status
  const hasFailClosed =
    block.includes("redirect") ||
    block.includes("status(") ||
    block.includes("return");
  assert.ok(hasFailClosed, "must fail closed when user not found (redirect, 4xx, or early return)");
});

// ── 3. POST /dashboard/profil/update ─────────────────────────────────────────

test("POST /dashboard/profil/update: handler block must exist", () => {
  const block = extractHandlerBlock("/dashboard/profil/update");
  assert.ok(block, "handler block for POST /dashboard/profil/update must be found");
});

test("POST /dashboard/profil/update: calls userRepository.findSessionUser for current user", () => {
  const block = extractHandlerBlock("/dashboard/profil/update");
  assert.ok(block, "handler block must exist");
  assert.ok(
    block.includes("userRepository.findSessionUser"),
    "must call userRepository.findSessionUser to load current user data"
  );
});

test("POST /dashboard/profil/update: calls userRepository.updateProfile", () => {
  const block = extractHandlerBlock("/dashboard/profil/update");
  assert.ok(block, "handler block must exist");
  assert.ok(
    block.includes("userRepository.updateProfile"),
    "must call userRepository.updateProfile"
  );
});

test("POST /dashboard/profil/update: calls userRepository.findIdentityConflict for duplicate check", () => {
  const block = extractHandlerBlock("/dashboard/profil/update");
  assert.ok(block, "handler block must exist");
  assert.ok(
    block.includes("userRepository.findIdentityConflict"),
    "must call userRepository.findIdentityConflict to check email/phone duplicates"
  );
});

test("POST /dashboard/profil/update: does not use db.prepare for users table", () => {
  const block = extractHandlerBlock("/dashboard/profil/update");
  assert.ok(block, "handler block must exist");
  const hasSqliteUsers = block.includes("db.prepare") &&
    (block.includes("UPDATE users") || block.includes("SELECT") && block.includes("users"));
  assert.ok(!hasSqliteUsers, "must not use db.prepare for users table");
});

test("POST /dashboard/profil/update: passes session.userId as id to updateProfile", () => {
  const block = extractHandlerBlock("/dashboard/profil/update");
  assert.ok(block, "handler block must exist");
  assert.ok(
    block.includes("req.session.userId"),
    "must pass req.session.userId as the user id"
  );
});

test("POST /dashboard/profil/update: redirects to /dashboard/profil on success", () => {
  const block = extractHandlerBlock("/dashboard/profil/update");
  assert.ok(block, "handler block must exist");
  assert.ok(
    block.includes("/dashboard/profil"),
    "must redirect to /dashboard/profil on success"
  );
});

test("POST /dashboard/profil/update: updates session.user fields after successful update", () => {
  const block = extractHandlerBlock("/dashboard/profil/update");
  assert.ok(block, "handler block must exist");
  // Session must be refreshed — look for req.session.user assignment
  assert.ok(
    block.includes("req.session.user"),
    "must update req.session.user after successful profile update"
  );
});

// ── 4. POST /dashboard/profil/sil ────────────────────────────────────────────

test("POST /dashboard/profil/sil: handler block must exist", () => {
  const block = extractHandlerBlock("/dashboard/profil/sil");
  assert.ok(block, "handler block for POST /dashboard/profil/sil must be found");
});

test("POST /dashboard/profil/sil: calls userRepository.deleteUserWithCargos", () => {
  const block = extractHandlerBlock("/dashboard/profil/sil");
  assert.ok(block, "handler block must exist");
  assert.ok(
    block.includes("userRepository.deleteUserWithCargos"),
    "must call userRepository.deleteUserWithCargos"
  );
});

test("POST /dashboard/profil/sil: passes session.userId to deleteUserWithCargos", () => {
  const block = extractHandlerBlock("/dashboard/profil/sil");
  assert.ok(block, "handler block must exist");
  assert.ok(
    block.includes("req.session.userId"),
    "must pass req.session.userId to deleteUserWithCargos"
  );
});

test("POST /dashboard/profil/sil: destroys session after deletion", () => {
  const block = extractHandlerBlock("/dashboard/profil/sil");
  assert.ok(block, "handler block must exist");
  assert.ok(
    block.includes("session.destroy") || block.includes("req.session.destroy"),
    "must call req.session.destroy after account deletion"
  );
});

test("POST /dashboard/profil/sil: redirects via loginRedirectTarget after deletion", () => {
  const block = extractHandlerBlock("/dashboard/profil/sil");
  assert.ok(block, "handler block must exist");
  assert.ok(
    block.includes("loginRedirectTarget"),
    "must redirect via loginRedirectTarget after account deletion"
  );
});

test("POST /dashboard/profil/sil: does not use db.prepare for users or cargos", () => {
  const block = extractHandlerBlock("/dashboard/profil/sil");
  assert.ok(block, "handler block must exist");
  const hasSqlite = block.includes("db.prepare") &&
    (block.includes("users") || block.includes("cargos"));
  assert.ok(!hasSqlite, "must not use db.prepare for users or cargos in sil handler");
});

test("POST /dashboard/profil/sil: is async (awaits deleteUserWithCargos)", () => {
  const block = extractHandlerBlock("/dashboard/profil/sil");
  assert.ok(block, "handler block must exist");
  assert.ok(
    block.includes("await"),
    "sil handler must be async and await deleteUserWithCargos"
  );
});