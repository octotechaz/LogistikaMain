"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");

// ── Helper: extract handler body for a specific HTTP method + path ────────────
function extractHandlerBlock(method, routePath) {
  const escaped = routePath.replace(/\//g, "\\/").replace(/:/g, "\\:");
  const routePattern = new RegExp(
    `app\\.${method}\\(\\s*['"]${escaped}['"]`
  );
  const lineStart = src.search(routePattern);
  if (lineStart === -1) return null;
  const asyncIdx = src.indexOf("async (req, res) =>", lineStart);
  if (asyncIdx === -1) return null;
  // Make sure the async handler belongs to this route (not the next one)
  // by checking there's no new app.get/app.post between lineStart and asyncIdx
  const between = src.slice(lineStart + 1, asyncIdx);
  if (/app\.(get|post)\(/.test(between)) return null;
  const braceIdx = src.indexOf("{", asyncIdx);
  if (braceIdx === -1) return null;
  let depth = 0;
  let i = braceIdx;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) break; }
  }
  return src.slice(braceIdx, i + 1);
}

// ── 1. userRepository is wired in index.js ───────────────────────────────────

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

// ── 2. POST /dashboard/api/send-otp ─────────────────────────────────────────

test("POST /dashboard/api/send-otp: calls userRepository.findIdentityConflict", () => {
  const block = extractHandlerBlock("post", "/dashboard/api/send-otp");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("userRepository.findIdentityConflict"),
    "must call userRepository.findIdentityConflict"
  );
});

test("POST /dashboard/api/send-otp: passes phone to findIdentityConflict", () => {
  const block = extractHandlerBlock("post", "/dashboard/api/send-otp");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("findIdentityConflict") && block.includes("phone"),
    "findIdentityConflict call must include phone"
  );
});

test("POST /dashboard/api/send-otp: findIdentityConflict appears BEFORE the fetch to send-code", () => {
  const block = extractHandlerBlock("post", "/dashboard/api/send-otp");
  assert.ok(block, "handler block must be found");
  const conflictIdx = block.indexOf("userRepository.findIdentityConflict");
  const sendCodeIdx = block.indexOf("send-code");
  assert.ok(conflictIdx !== -1, "must call userRepository.findIdentityConflict");
  assert.ok(sendCodeIdx !== -1, "must call send-code fetch");
  assert.ok(conflictIdx < sendCodeIdx, "findIdentityConflict must appear before the send-code fetch");
});

test("POST /dashboard/api/send-otp: no db.prepare in handler", () => {
  const block = extractHandlerBlock("post", "/dashboard/api/send-otp");
  assert.ok(block, "handler block must be found");
  assert.ok(!block.includes("db.prepare"), "must not use db.prepare in send-otp handler");
});

test("POST /dashboard/api/send-otp: awaits userRepository.findIdentityConflict", () => {
  const block = extractHandlerBlock("post", "/dashboard/api/send-otp");
  assert.ok(block, "handler block must be found");
  assert.ok(
    /await\s+userRepository\.findIdentityConflict/.test(block),
    "must await userRepository.findIdentityConflict"
  );
});

// ── 3. POST /dashboard/qeydiyyat ─────────────────────────────────────────────

test("POST /dashboard/qeydiyyat: calls userRepository.findIdentityConflict", () => {
  const block = extractHandlerBlock("post", "/dashboard/qeydiyyat");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("userRepository.findIdentityConflict"),
    "must call userRepository.findIdentityConflict"
  );
});

test("POST /dashboard/qeydiyyat: findIdentityConflict appears BEFORE verify-otp fetch", () => {
  const block = extractHandlerBlock("post", "/dashboard/qeydiyyat");
  assert.ok(block, "handler block must be found");
  const conflictIdx = block.indexOf("userRepository.findIdentityConflict");
  const verifyIdx = block.indexOf("verify-otp");
  assert.ok(conflictIdx !== -1, "must call userRepository.findIdentityConflict");
  assert.ok(verifyIdx !== -1, "must call verify-otp fetch");
  assert.ok(conflictIdx < verifyIdx, "findIdentityConflict must appear before verify-otp fetch");
});

test("POST /dashboard/qeydiyyat: calls userRepository.createLegacyUser", () => {
  const block = extractHandlerBlock("post", "/dashboard/qeydiyyat");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("userRepository.createLegacyUser"),
    "must call userRepository.createLegacyUser"
  );
});

test("POST /dashboard/qeydiyyat: createLegacyUser appears AFTER verify-otp fetch", () => {
  const block = extractHandlerBlock("post", "/dashboard/qeydiyyat");
  assert.ok(block, "handler block must be found");
  const verifyIdx = block.indexOf("verify-otp");
  const createIdx = block.indexOf("userRepository.createLegacyUser");
  assert.ok(verifyIdx !== -1, "must call verify-otp fetch");
  assert.ok(createIdx !== -1, "must call userRepository.createLegacyUser");
  assert.ok(createIdx > verifyIdx, "createLegacyUser must appear after verify-otp fetch");
});

test("POST /dashboard/qeydiyyat: awaits userRepository.createLegacyUser", () => {
  const block = extractHandlerBlock("post", "/dashboard/qeydiyyat");
  assert.ok(block, "handler block must be found");
  assert.ok(
    /await\s+userRepository\.createLegacyUser/.test(block),
    "must await userRepository.createLegacyUser"
  );
});

test("POST /dashboard/qeydiyyat: passes vehicleType to createLegacyUser", () => {
  const block = extractHandlerBlock("post", "/dashboard/qeydiyyat");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("createLegacyUser") && block.includes("vehicleType"),
    "createLegacyUser call must include vehicleType"
  );
});

test("POST /dashboard/qeydiyyat: passes capacity to createLegacyUser", () => {
  const block = extractHandlerBlock("post", "/dashboard/qeydiyyat");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("createLegacyUser") && block.includes("capacity"),
    "createLegacyUser call must include capacity"
  );
});

test("POST /dashboard/qeydiyyat: no db.prepare touching users table in handler", () => {
  const block = extractHandlerBlock("post", "/dashboard/qeydiyyat");
  assert.ok(block, "handler block must be found");
  const hasUsersPrepare = block.includes("db.prepare") &&
    (block.includes("users") || block.includes("INTO users") || block.includes("FROM users"));
  assert.ok(!hasUsersPrepare, "must not use db.prepare for users table in qeydiyyat handler");
});

test("POST /dashboard/qeydiyyat: auto-logs in and redirects to public site on success", () => {
  const block = extractHandlerBlock("post", "/dashboard/qeydiyyat");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("req.session.userId") && block.includes("PUBLIC_APP_URL") && block.includes("registered=1"),
    "must auto-login and redirect to PUBLIC_APP_URL/?registered=1 on success"
  );
  assert.ok(
    !block.includes("/dashboard/login?registered=true"),
    "must not redirect to /dashboard/login?registered=true"
  );
});