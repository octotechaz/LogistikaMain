"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");

// ── Helper: extract the handler body for a given route definition ─────────────
// Matches: app.METHOD('ROUTE', ..., async (req, res) => { ... });
// Returns the substring starting at the opening brace of the last arrow function.
function extractHandlerBlock(routeMethod, routePath) {
  // Find the app.get/app.post line for this path
  const routePattern = new RegExp(
    `app\\.(?:get|post)\\(\\s*'${routePath.replace(/\//g, "\\/").replace(/:/g, "\\:")}'`
  );
  const lineStart = src.search(routePattern);
  if (lineStart === -1) return null;

  // Find the opening brace of the last arrow function callback on this route
  // Walk forward from lineStart to find "async (req, res) => {"
  const asyncIdx = src.indexOf("async (req, res) =>", lineStart);
  if (asyncIdx === -1) return null;
  const braceIdx = src.indexOf("{", asyncIdx);
  if (braceIdx === -1) return null;

  // Balance braces to find the handler body
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

// ── 1. cargoRepository is imported and instantiated ──────────────────────────

test("index.js: imports makeCargoRepository from postgresCargoRepository", () => {
  assert.ok(
    src.includes("require('./postgresCargoRepository')") ||
    src.includes('require("./postgresCargoRepository")'),
    "must require('./postgresCargoRepository')"
  );
  assert.ok(
    src.includes("makeCargoRepository"),
    "must destructure makeCargoRepository"
  );
});

test("index.js: creates cargoRepository instance with prisma", () => {
  assert.ok(
    src.includes("makeCargoRepository(prisma)"),
    "must call makeCargoRepository(prisma)"
  );
});

// ── 2. /dashboard/menim-elanlarim uses listForSessionOwner ──────────────────

test("GET /dashboard/menim-elanlarim: uses cargoRepository.listForSessionOwner", () => {
  const block = extractHandlerBlock("get", "/dashboard/menim-elanlarim");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("cargoRepository.listForSessionOwner"),
    "must call cargoRepository.listForSessionOwner"
  );
});

test("GET /dashboard/menim-elanlarim: passes session.userId to listForSessionOwner", () => {
  const block = extractHandlerBlock("get", "/dashboard/menim-elanlarim");
  assert.ok(
    block.includes("req.session.userId"),
    "must pass req.session.userId"
  );
});

test("GET /dashboard/menim-elanlarim: no cargo SQLite prepare in handler", () => {
  const block = extractHandlerBlock("get", "/dashboard/menim-elanlarim");
  assert.ok(block, "handler block must be found");
  assert.ok(
    !block.includes("db.prepare") || !block.includes("cargos"),
    "must not use db.prepare for cargo queries"
  );
});

// ── 3. /dashboard/elan/sil/:id uses deleteForSessionOwner ───────────────────

test("POST /dashboard/elan/sil/:id: uses cargoRepository.deleteForSessionOwner", () => {
  const block = extractHandlerBlock("post", "/dashboard/elan/sil/:id");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("cargoRepository.deleteForSessionOwner"),
    "must call cargoRepository.deleteForSessionOwner"
  );
});

test("POST /dashboard/elan/sil/:id: passes req.params.id and session.userId", () => {
  const block = extractHandlerBlock("post", "/dashboard/elan/sil/:id");
  assert.ok(block.includes("req.params.id"), "must pass req.params.id");
  assert.ok(block.includes("req.session.userId"), "must pass req.session.userId");
});

test("POST /dashboard/elan/sil/:id: redirects to /dashboard/menim-elanlarim", () => {
  const block = extractHandlerBlock("post", "/dashboard/elan/sil/:id");
  assert.ok(
    block.includes("/dashboard/menim-elanlarim"),
    "must redirect to /dashboard/menim-elanlarim"
  );
});

test("POST /dashboard/elan/sil/:id: no cargo SQLite prepare in handler", () => {
  const block = extractHandlerBlock("post", "/dashboard/elan/sil/:id");
  assert.ok(
    !block.includes("db.prepare") || !block.includes("cargos"),
    "must not use db.prepare for cargo queries"
  );
});

// ── 4. /dashboard/butun-elanlar uses listForAdmin ────────────────────────────

test("GET /dashboard/butun-elanlar: uses cargoRepository.listForAdmin", () => {
  const block = extractHandlerBlock("get", "/dashboard/butun-elanlar");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("cargoRepository.listForAdmin"),
    "must call cargoRepository.listForAdmin"
  );
});

test("GET /dashboard/butun-elanlar: no cargo SQLite prepare in handler", () => {
  const block = extractHandlerBlock("get", "/dashboard/butun-elanlar");
  assert.ok(
    !block.includes("db.prepare") || !block.includes("cargos"),
    "must not use db.prepare for cargo queries"
  );
});

// ── 5. /dashboard/elan/status/:id uses updateAdminStatus ─────────────────────

test("POST /dashboard/elan/status/:id: uses cargoRepository.updateAdminStatus", () => {
  const block = extractHandlerBlock("post", "/dashboard/elan/status/:id");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("cargoRepository.updateAdminStatus"),
    "must call cargoRepository.updateAdminStatus"
  );
});

test("POST /dashboard/elan/status/:id: passes req.params.id and req.body.status", () => {
  const block = extractHandlerBlock("post", "/dashboard/elan/status/:id");
  assert.ok(block.includes("req.params.id"), "must pass req.params.id");
  assert.ok(block.includes("req.body.status") || block.includes("status"), "must use req.body.status");
});

test("POST /dashboard/elan/status/:id: redirects to /dashboard/butun-elanlar", () => {
  const block = extractHandlerBlock("post", "/dashboard/elan/status/:id");
  assert.ok(
    block.includes("/dashboard/butun-elanlar"),
    "must redirect to /dashboard/butun-elanlar"
  );
});

test("POST /dashboard/elan/status/:id: no cargo SQLite prepare in handler", () => {
  const block = extractHandlerBlock("post", "/dashboard/elan/status/:id");
  assert.ok(
    !block.includes("db.prepare") || !block.includes("cargos"),
    "must not use db.prepare for cargo queries"
  );
});

// ── 6. /dashboard/elan/admin-sil/:id uses deleteForAdmin ─────────────────────

test("POST /dashboard/elan/admin-sil/:id: uses cargoRepository.deleteForAdmin", () => {
  const block = extractHandlerBlock("post", "/dashboard/elan/admin-sil/:id");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("cargoRepository.deleteForAdmin"),
    "must call cargoRepository.deleteForAdmin"
  );
});

test("POST /dashboard/elan/admin-sil/:id: passes req.params.id", () => {
  const block = extractHandlerBlock("post", "/dashboard/elan/admin-sil/:id");
  assert.ok(block.includes("req.params.id"), "must pass req.params.id");
});

test("POST /dashboard/elan/admin-sil/:id: redirects to /dashboard/butun-elanlar", () => {
  const block = extractHandlerBlock("post", "/dashboard/elan/admin-sil/:id");
  assert.ok(
    block.includes("/dashboard/butun-elanlar"),
    "must redirect to /dashboard/butun-elanlar"
  );
});

test("POST /dashboard/elan/admin-sil/:id: no cargo SQLite prepare in handler", () => {
  const block = extractHandlerBlock("post", "/dashboard/elan/admin-sil/:id");
  assert.ok(
    !block.includes("db.prepare") || !block.includes("cargos"),
    "must not use db.prepare for cargo queries"
  );
});

// ── 7. No cargo db.prepare calls remain in any of the 5 route bodies ─────────

test("index.js: no 'db.prepare' touching cargos table remains in the 5 route handlers", () => {
  const routes = [
    ["/dashboard/menim-elanlarim"],
    ["/dashboard/elan/sil/:id"],
    ["/dashboard/butun-elanlar"],
    ["/dashboard/elan/status/:id"],
    ["/dashboard/elan/admin-sil/:id"],
  ];
  for (const [route] of routes) {
    const block = extractHandlerBlock("any", route) ??
      extractHandlerBlock("get", route) ??
      extractHandlerBlock("post", route);
    if (!block) continue;
    // A db.prepare that references the cargos table is a violation
    const hasCargoPrepare = block.includes("db.prepare") &&
      (block.includes("cargos") || block.includes("FROM cargos") || block.includes("INTO cargos"));
    assert.ok(!hasCargoPrepare, `Route ${route} must not contain db.prepare for cargos table`);
  }
});

// ── 8. /dashboard/menim-elanlarim uses listForSessionOwner ───────────────────

test("GET /dashboard/menim-elanlarim: uses cargoRepository.listForSessionOwner", () => {
  const block = extractHandlerBlock("get", "/dashboard/menim-elanlarim");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("cargoRepository.listForSessionOwner"),
    "must call cargoRepository.listForSessionOwner"
  );
});

test("GET /dashboard/menim-elanlarim: does NOT call listForLegacyOwner directly", () => {
  const block = extractHandlerBlock("get", "/dashboard/menim-elanlarim");
  assert.ok(block, "handler block must be found");
  assert.ok(
    !block.includes("listForLegacyOwner"),
    "must not call listForLegacyOwner directly (use listForSessionOwner instead)"
  );
});

test("GET /dashboard/menim-elanlarim: passes req.session.userId to listForSessionOwner", () => {
  const block = extractHandlerBlock("get", "/dashboard/menim-elanlarim");
  assert.ok(block.includes("req.session.userId"), "must pass req.session.userId");
});

// ── 9. /dashboard/elan/sil/:id uses deleteForSessionOwner ────────────────────

test("POST /dashboard/elan/sil/:id: uses cargoRepository.deleteForSessionOwner", () => {
  const block = extractHandlerBlock("post", "/dashboard/elan/sil/:id");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("cargoRepository.deleteForSessionOwner"),
    "must call cargoRepository.deleteForSessionOwner"
  );
});

test("POST /dashboard/elan/sil/:id: does NOT call deleteForLegacyOwner directly", () => {
  const block = extractHandlerBlock("post", "/dashboard/elan/sil/:id");
  assert.ok(block, "handler block must be found");
  assert.ok(
    !block.includes("deleteForLegacyOwner"),
    "must not call deleteForLegacyOwner directly (use deleteForSessionOwner instead)"
  );
});

test("POST /dashboard/elan/sil/:id: passes req.params.id and req.session.userId to deleteForSessionOwner", () => {
  const block = extractHandlerBlock("post", "/dashboard/elan/sil/:id");
  assert.ok(block.includes("req.params.id"), "must pass req.params.id");
  assert.ok(block.includes("req.session.userId"), "must pass req.session.userId");
});

test("POST /dashboard/elan/sil/:id: redirects to /dashboard/menim-elanlarim after deleteForSessionOwner", () => {
  const block = extractHandlerBlock("post", "/dashboard/elan/sil/:id");
  assert.ok(
    block.includes("/dashboard/menim-elanlarim"),
    "must redirect to /dashboard/menim-elanlarim"
  );
});

// ── 10. POST /dashboard/yeni-elan uses cargoRepository.createCargo ────────────

test("index.js: imports makeCargoRepository from postgresCargoRepository (createCargo path)", () => {
  assert.ok(
    src.includes("require('./postgresCargoRepository')") ||
    src.includes('require("./postgresCargoRepository")'),
    "must require('./postgresCargoRepository')"
  );
  assert.ok(src.includes("makeCargoRepository"), "must destructure makeCargoRepository");
});

test("POST /dashboard/yeni-elan: handler block is present in index.js", () => {
  const block = extractHandlerBlock("post", "/dashboard/yeni-elan");
  assert.ok(block, "POST /dashboard/yeni-elan handler block must be found in index.js");
});

test("POST /dashboard/yeni-elan: calls cargoRepository.createCargo", () => {
  const block = extractHandlerBlock("post", "/dashboard/yeni-elan");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("cargoRepository.createCargo"),
    "must call cargoRepository.createCargo"
  );
});

test("POST /dashboard/yeni-elan: passes req.session.userId as ownerId", () => {
  const block = extractHandlerBlock("post", "/dashboard/yeni-elan");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("req.session.userId"),
    "must pass req.session.userId as ownerId"
  );
});

test("POST /dashboard/yeni-elan: redirects to /dashboard/menim-elanlarim on success", () => {
  const block = extractHandlerBlock("post", "/dashboard/yeni-elan");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("/dashboard/menim-elanlarim"),
    "must redirect to /dashboard/menim-elanlarim after successful creation"
  );
});

test("POST /dashboard/yeni-elan: no cargo SQLite prepare in handler", () => {
  const block = extractHandlerBlock("post", "/dashboard/yeni-elan");
  assert.ok(block, "handler block must be found");
  const hasCargoPrepare =
    block.includes("db.prepare") &&
    (block.includes("cargos") || block.includes("INSERT INTO") || block.includes("cargo_images"));
  assert.ok(!hasCargoPrepare, "must not use db.prepare for cargo creation");
});

test("POST /dashboard/yeni-elan: awaits createCargo (async call)", () => {
  const block = extractHandlerBlock("post", "/dashboard/yeni-elan");
  assert.ok(block, "handler block must be found");
  assert.ok(
    block.includes("await") && block.includes("cargoRepository.createCargo"),
    "must await cargoRepository.createCargo"
  );
});

