"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// ── Fake Prisma builder ───────────────────────────────────────────────────────

function makeFakePrisma(overrides = {}) {
  const calls = [];
  const publicCategory = {
    findMany: async (args) => { calls.push({ method: "findMany", args }); return overrides.findMany ?? []; },
    upsert:   async (args) => { calls.push({ method: "upsert",   args }); return overrides.upsert   ?? {}; },
    delete:   async (args) => { calls.push({ method: "delete",   args }); return overrides.delete   ?? {}; },
  };
  return { prisma: { publicCategory }, calls };
}

function makeRepo(overrides = {}) {
  const { prisma, calls } = makeFakePrisma(overrides);
  // Inject via factory: require fresh each time to avoid module cache issues
  const repoCacheKey = require.resolve("./postgresCategoryRepository.js");
  delete require.cache[repoCacheKey];
  const { makeCategoryRepository } = require("./postgresCategoryRepository.js");
  return { repo: makeCategoryRepository(prisma), calls };
}

// ── listOrdered ───────────────────────────────────────────────────────────────

test("listOrdered: calls findMany with orderBy sortOrder asc then label asc", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listOrdered();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "findMany");
  const orderBy = calls[0].args.orderBy;
  assert.ok(Array.isArray(orderBy), "orderBy must be an array");
  assert.deepEqual(orderBy[0], { sortOrder: "asc" });
  assert.deepEqual(orderBy[1], { label: "asc" });
});

test("listOrdered: maps Prisma camelCase fields to snake_case DTO", async () => {
  const pgRow = {
    id: "clxabc",
    legacySqliteId: "cat_abc123",
    label: "Yük",
    iconKey: "boxes",
    iconTone: "text-slate-500",
    matchCargoType: null,
    matchVehicleType: null,
    matchKeyword: null,
    sortOrder: 3,
    isActive: true,
  };
  const { repo } = makeRepo({ findMany: [pgRow] });
  const rows = await repo.listOrdered();
  assert.equal(rows.length, 1);
  const r = rows[0];
  assert.equal(r.id, "cat_abc123", "id must be legacySqliteId");
  assert.equal(r.label, "Yük");
  assert.equal(r.icon_key, "boxes");
  assert.equal(r.icon_tone, "text-slate-500");
  assert.equal(r.sort_order, 3);
  assert.equal(r.is_active, 1, "isActive=true must map to 1");
});

test("listOrdered: isActive=false maps to 0", async () => {
  const pgRow = {
    id: "clxdef",
    legacySqliteId: "cat_def456",
    label: "Test",
    iconKey: "box",
    iconTone: "text-blue-500",
    matchCargoType: null,
    matchVehicleType: null,
    matchKeyword: null,
    sortOrder: 0,
    isActive: false,
  };
  const { repo } = makeRepo({ findMany: [pgRow] });
  const rows = await repo.listOrdered();
  assert.equal(rows[0].is_active, 0);
});

// ── upsert ────────────────────────────────────────────────────────────────────

test("upsert (update path): when legacySqliteId provided, calls prisma upsert with correct where/update", async () => {
  const { repo, calls } = makeRepo({ upsert: {} });
  await repo.upsert({
    id: "cat_existing",
    label: "Kargo",
    icon_key: "truck",
    icon_tone: "text-blue-500",
    sort_order: 2,
    is_active: "1",
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "upsert");
  const args = calls[0].args;
  assert.deepEqual(args.where, { legacySqliteId: "cat_existing" });
  assert.equal(args.update.label, "Kargo");
  assert.equal(args.update.iconKey, "truck");
  assert.equal(args.update.iconTone, "text-blue-500");
  assert.equal(args.update.sortOrder, 2);
  assert.equal(args.update.isActive, true);
});

test("upsert (insert path): when id is empty string, generates new legacySqliteId starting with cat_", async () => {
  const { repo, calls } = makeRepo({ upsert: {} });
  await repo.upsert({
    id: "",
    label: "Yeni",
    icon_key: "boxes",
    icon_tone: "text-slate-500",
    sort_order: 0,
    is_active: "1",
  });
  assert.equal(calls.length, 1);
  const args = calls[0].args;
  assert.match(args.where.legacySqliteId, /^cat_/, "generated id must start with cat_");
  assert.equal(args.create.label, "Yeni");
  assert.equal(args.create.legacySqliteId, args.where.legacySqliteId);
});

test("upsert: is_active='0' maps to isActive=false", async () => {
  const { repo, calls } = makeRepo({ upsert: {} });
  await repo.upsert({
    id: "cat_x",
    label: "X",
    icon_key: "boxes",
    icon_tone: "text-slate-500",
    sort_order: 0,
    is_active: "0",
  });
  assert.equal(calls[0].args.update.isActive, false);
});

test("upsert: missing icon_key defaults to 'boxes'", async () => {
  const { repo, calls } = makeRepo({ upsert: {} });
  await repo.upsert({
    id: "cat_y",
    label: "Y",
    icon_key: undefined,
    icon_tone: undefined,
    sort_order: "5",
    is_active: "1",
  });
  const u = calls[0].args.update;
  assert.equal(u.iconKey, "boxes");
  assert.equal(u.iconTone, "text-slate-500");
  assert.equal(u.sortOrder, 5);
});

// ── deleteById ────────────────────────────────────────────────────────────────

test("deleteById: calls prisma.publicCategory.delete with where legacySqliteId", async () => {
  const { repo, calls } = makeRepo({ delete: {} });
  await repo.deleteById("cat_del123");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "delete");
  assert.deepEqual(calls[0].args.where, { legacySqliteId: "cat_del123" });
});

test("deleteById: does nothing when id is falsy", async () => {
  const { repo, calls } = makeRepo({ delete: {} });
  await repo.deleteById(null);
  assert.equal(calls.length, 0, "no DB call when id is null");
  await repo.deleteById("");
  assert.equal(calls.length, 0, "no DB call when id is empty string");
});

// ── No SQLite contract ────────────────────────────────────────────────────────

test("repository module does not require better-sqlite3 or sqlite3", () => {
  const fs = require("fs");
  const src = fs.readFileSync(
    require("path").join(__dirname, "postgresCategoryRepository.js"),
    "utf8"
  );
  assert.ok(!src.includes("better-sqlite3"), "must not import better-sqlite3");
  assert.ok(!src.includes("require('sqlite3')") && !src.includes('require("sqlite3")'), "must not import sqlite3");
  assert.ok(!src.includes(".prepare("), "must not use .prepare() (SQLite API)");
});