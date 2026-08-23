"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// ── Fake Prisma builder ───────────────────────────────────────────────────────

function makeFakePrisma(overrides = {}) {
  const calls = [];

  const cargoPost = {
    findMany: async (args) => {
      calls.push({ method: "cargoPost.findMany", args });
      return overrides.findMany ?? [];
    },
    update: async (args) => {
      calls.push({ method: "cargoPost.update", args });
      return overrides.update ?? {};
    },
    updateMany: async (args) => {
      calls.push({ method: "cargoPost.updateMany", args });
      return overrides.updateMany ?? { count: 1 };
    },
    delete: async (args) => {
      calls.push({ method: "cargoPost.delete", args });
      return overrides.delete ?? {};
    },
    deleteMany: async (args) => {
      calls.push({ method: "cargoPost.deleteMany", args });
      return overrides.deleteMany ?? { count: 1 };
    },
    findFirst: async (args) => {
      calls.push({ method: "cargoPost.findFirst", args });
      return overrides.findFirst ?? null;
    },
  };

  // $transaction receives a callback and executes it with the same prisma mock
  const prisma = {
    cargoPost,
    $transaction: async (fn) => {
      calls.push({ method: "$transaction" });
      return fn(prisma);
    },
  };

  return { prisma, calls };
}

function makeRepo(overrides = {}) {
  const { prisma, calls } = makeFakePrisma(overrides);
  const key = require.resolve("./postgresCargoRepository.js");
  delete require.cache[key];
  const { makeCargoRepository } = require("./postgresCargoRepository.js");
  return { repo: makeCargoRepository(prisma), calls };
}

// ── Sample Prisma row ─────────────────────────────────────────────────────────

function makePgRow(overrides = {}) {
  return {
    id: "clxabc123",
    legacySqliteId: 42,
    cargoName: "Cement",
    cargoType: "Bulk",
    description: "Heavy bags",
    weight: 10.5,
    volume: 3.2,
    length: 2,
    width: 1.5,
    height: 1,
    quantity: "20",
    pickupAddress: "Yard 1",
    deliveryAddress: "Site 9",
    pickupCity: "Baku",
    deliveryCity: "Ganja",
    pickupDate: new Date("2026-07-28T00:00:00.000Z"),
    pickupDeadlineDate: new Date("2026-08-01T00:00:00.000Z"),
    createdAt: new Date("2026-07-01T12:00:00.000Z"),
    requiredVehicleType: "Tentli",
    proposedPrice: { toString: () => "150.00" },
    contactPhone: "+994501112233",
    legacyPickupTime: "10:00",
    legacyNote: "Handle carefully",
    needsLoadingHelp: "Bəli",
    needsUnloadingHelp: "Xeyr",
    requiresInvoice: "Xeyr",
    roundTrip: "Bəli",
    legacyAdminStatus: "PENDING",
    owner: {
      firstName: "Ali",
      lastName: "Mammadov",
      email: "ali@example.com",
      phone: "+994501234567",
    },
    images: [{ url: "https://cdn.example.com/a.jpg" }],
    ...overrides,
  };
}

// ── DTO mapping ───────────────────────────────────────────────────────────────

test("listForAdmin: maps Prisma row to EJS DTO correctly", async () => {
  const row = makePgRow();
  const { repo } = makeRepo({ findMany: [row] });
  const rows = await repo.listForAdmin();
  assert.equal(rows.length, 1);
  const r = rows[0];
  assert.equal(r.id, "42", "id must be String(legacySqliteId)");
  assert.equal(r.title, "Cement", "title must be cargoName");
  assert.equal(r.cargo_type, "Bulk");
  assert.equal(r.description, "Heavy bags");
  assert.equal(r.weight, 10.5);
  assert.equal(r.volume, 3.2);
  assert.equal(r.length, 2);
  assert.equal(r.width, 1.5);
  assert.equal(r.height, 1);
  assert.equal(r.quantity, "20");
  assert.equal(r.loading_city, "Baku");
  assert.equal(r.loading_address, "Yard 1");
  assert.equal(r.unloading_city, "Ganja");
  assert.equal(r.unloading_address, "Site 9");
  assert.deepEqual(r.pickup_date, new Date("2026-07-28T00:00:00.000Z"));
  assert.deepEqual(r.latest_pickup_date, new Date("2026-08-01T00:00:00.000Z"));
  assert.equal(r.loading_time, "10:00");
  assert.equal(r.transport_type, "Tentli");
  assert.equal(r.price, "150.00");
  assert.equal(r.phone, "+994501112233");
  assert.equal(r.notes, "Handle carefully");
  assert.equal(r.needs_loading_help, "Bəli");
  assert.equal(r.needs_unloading_help, "Xeyr");
  assert.equal(r.requires_invoice, "Xeyr");
  assert.equal(r.round_trip, "Bəli");
  assert.deepEqual(r.created_at, new Date("2026-07-01T12:00:00.000Z"));
  assert.equal(r.user_name, "Ali Mammadov");
  assert.equal(r.user_email, "ali@example.com");
  assert.equal(r.user_phone, "+994501234567");
  assert.equal(r.status, "PENDING");
  assert.deepEqual(r.images, ["https://cdn.example.com/a.jpg"]);
});

test("listForAdmin: user_name omits trailing space when lastName is empty", async () => {
  const row = makePgRow({ owner: { firstName: "Ali", lastName: "", email: "ali@example.com", phone: "" } });
  const { repo } = makeRepo({ findMany: [row] });
  const [r] = await repo.listForAdmin();
  assert.equal(r.user_name, "Ali");
});

test("listForAdmin: user_name omits trailing space when lastName is null", async () => {
  const row = makePgRow({ owner: { firstName: "Ali", lastName: null, email: "ali@example.com", phone: "" } });
  const { repo } = makeRepo({ findMany: [row] });
  const [r] = await repo.listForAdmin();
  assert.equal(r.user_name, "Ali");
});

// ── listForAdmin query constraints ───────────────────────────────────────────

test("listForAdmin: calls findMany with orderBy createdAt desc", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listForAdmin();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "cargoPost.findMany");
  const { orderBy } = calls[0].args;
  assert.ok(Array.isArray(orderBy) ? orderBy[0].createdAt === "desc" : orderBy.createdAt === "desc",
    "must order by createdAt desc");
});

test("listForAdmin: includes owner and images relations", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listForAdmin();
  const { include } = calls[0].args;
  assert.ok(include && include.owner, "must include owner");
  assert.ok(include && include.images, "must include images");
});

test("listForAdmin: does NOT filter by ownerId", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listForAdmin();
  const { where } = calls[0].args;
  assert.ok(!where || !where.ownerId, "listForAdmin must not filter by ownerId");
});

// ── listForOwner ──────────────────────────────────────────────────────────────

test("listForOwner: filters by ownerId", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listForOwner("user_xyz");
  assert.equal(calls[0].method, "cargoPost.findMany");
  assert.equal(calls[0].args.where?.ownerId, "user_xyz");
});

test("listForOwner: orders by createdAt desc", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listForOwner("user_xyz");
  const { orderBy } = calls[0].args;
  assert.ok(Array.isArray(orderBy) ? orderBy[0].createdAt === "desc" : orderBy.createdAt === "desc",
    "must order by createdAt desc");
});

test("listForOwner: includes owner relation", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listForOwner("user_xyz");
  const { include } = calls[0].args;
  assert.ok(include && include.owner, "must include owner");
});

test("listForOwner: maps DTO correctly", async () => {
  const row = makePgRow();
  const { repo } = makeRepo({ findMany: [row] });
  const [r] = await repo.listForOwner("user_xyz");
  assert.equal(r.id, "42");
  assert.equal(r.title, "Cement");
  assert.equal(r.loading_city, "Baku");
});

// ── updateAdminStatus ─────────────────────────────────────────────────────────

test("updateAdminStatus: throws on invalid status", async () => {
  const { repo } = makeRepo({ update: {} });
  await assert.rejects(
    () => repo.updateAdminStatus(42, "UNKNOWN"),
    /invalid/i,
    "must throw with 'invalid' for unknown status"
  );
});

test("updateAdminStatus: throws on empty string status", async () => {
  const { repo } = makeRepo({ update: {} });
  await assert.rejects(() => repo.updateAdminStatus(42, ""), /invalid/i);
});

test("updateAdminStatus: accepts PENDING", async () => {
  const { repo } = makeRepo({ update: {} });
  await assert.doesNotReject(() => repo.updateAdminStatus(42, "PENDING"));
});

test("updateAdminStatus: accepts APPROVED", async () => {
  const { repo } = makeRepo({ update: {} });
  await assert.doesNotReject(() => repo.updateAdminStatus(42, "APPROVED"));
});

test("updateAdminStatus: accepts REJECTED", async () => {
  const { repo } = makeRepo({ update: {} });
  await assert.doesNotReject(() => repo.updateAdminStatus(42, "REJECTED"));
});

test("updateAdminStatus: uses $transaction", async () => {
  const { repo, calls } = makeRepo({ update: {} });
  await repo.updateAdminStatus(42, "APPROVED");
  assert.ok(calls.some(c => c.method === "$transaction"), "must use $transaction");
});

test("updateAdminStatus: updates legacyAdminStatus field to given value", async () => {
  const { repo, calls } = makeRepo({ updateMany: { count: 1 } });
  await repo.updateAdminStatus(42, "APPROVED");
  const updateCall = calls.find(c => c.method === "cargoPost.updateMany");
  assert.ok(updateCall, "must call cargoPost.updateMany");
  assert.equal(updateCall.args.data.legacyAdminStatus, "APPROVED");
});

test("updateAdminStatus: targets row by legacySqliteId", async () => {
  const { repo, calls } = makeRepo({ updateMany: { count: 1 } });
  await repo.updateAdminStatus(42, "APPROVED");
  const updateCall = calls.find(c => c.method === "cargoPost.updateMany");
  assert.deepEqual(updateCall.args.where, { legacySqliteId: 42 });
});

test("updateAdminStatus: APPROVED maps CargoPost.status to ACTIVE", async () => {
  const { repo, calls } = makeRepo({ updateMany: { count: 1 } });
  await repo.updateAdminStatus(42, "APPROVED");
  const updateCall = calls.find(c => c.method === "cargoPost.updateMany");
  assert.equal(updateCall.args.data.status, "ACTIVE");
});

test("updateAdminStatus: PENDING maps CargoPost.status to CANCELLED", async () => {
  const { repo, calls } = makeRepo({ updateMany: { count: 1 } });
  await repo.updateAdminStatus(42, "PENDING");
  const updateCall = calls.find(c => c.method === "cargoPost.updateMany");
  assert.equal(updateCall.args.data.status, "CANCELLED");
});

test("updateAdminStatus: REJECTED maps CargoPost.status to CANCELLED", async () => {
  const { repo, calls } = makeRepo({ updateMany: { count: 1 } });
  await repo.updateAdminStatus(42, "REJECTED");
  const updateCall = calls.find(c => c.method === "cargoPost.updateMany");
  assert.equal(updateCall.args.data.status, "CANCELLED");
});

// ── deleteForAdmin ────────────────────────────────────────────────────────────

test("deleteForAdmin: uses $transaction", async () => {
  const { repo, calls } = makeRepo({ deleteMany: { count: 1 } });
  await repo.deleteForAdmin(99);
  assert.ok(calls.some(c => c.method === "$transaction"), "must use $transaction");
});

test("deleteForAdmin: deletes by legacySqliteId", async () => {
  const { repo, calls } = makeRepo({ deleteMany: { count: 1 } });
  await repo.deleteForAdmin(99);
  const deleteCall = calls.find(c => c.method === "cargoPost.deleteMany");
  assert.ok(deleteCall, "must call cargoPost.deleteMany");
  assert.equal(deleteCall.args.where.legacySqliteId, 99);
});

test("deleteForAdmin: does not scope to ownerId", async () => {
  const { repo, calls } = makeRepo({ deleteMany: { count: 1 } });
  await repo.deleteForAdmin(99);
  const deleteCall = calls.find(c => c.method === "cargoPost.deleteMany");
  assert.ok(!deleteCall.args.where.ownerId, "deleteForAdmin must not scope by ownerId");
});

// ── deleteForOwner ────────────────────────────────────────────────────────────

test("deleteForOwner: uses $transaction", async () => {
  const { repo, calls } = makeRepo({ delete: {} });
  await repo.deleteForOwner(99, "user_abc");
  assert.ok(calls.some(c => c.method === "$transaction"), "must use $transaction");
});

test("deleteForOwner: deletes by legacySqliteId AND ownerId", async () => {
  const { repo, calls } = makeRepo({ delete: {} });
  await repo.deleteForOwner(99, "user_abc");
  const deleteCall = calls.find(c => c.method === "cargoPost.delete");
  assert.ok(deleteCall, "must call cargoPost.delete");
  assert.equal(deleteCall.args.where.legacySqliteId, 99);
  assert.equal(deleteCall.args.where.ownerId, "user_abc");
});

// ── No SQLite contract ────────────────────────────────────────────────────────

test("module does not import SQLite", () => {
  const fs = require("fs");
  const path = require("path");
  const src = fs.readFileSync(
    path.join(__dirname, "postgresCargoRepository.js"),
    "utf8"
  );
  assert.ok(!src.includes("better-sqlite3"), "must not import better-sqlite3");
  assert.ok(
    !src.includes("require('sqlite3')") && !src.includes('require("sqlite3")'),
    "must not import sqlite3"
  );
  assert.ok(!src.includes(".prepare("), "must not use .prepare() (SQLite API)");
});

// ── listForAdmin: legacy-only filter ─────────────────────────────────────────

test("listForAdmin: returns all cargo posts (no legacy-only filter)", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listForAdmin();
  const { where } = calls[0].args;
  assert.equal(where, undefined, "listForAdmin must not filter by legacySqliteId");
});

// ── listForLegacyOwner ────────────────────────────────────────────────────────

test("listForLegacyOwner: calls findMany with owner.legacySqliteId = Number(legacyUserId)", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listForLegacyOwner("7");
  assert.equal(calls[0].method, "cargoPost.findMany");
  const { where } = calls[0].args;
  assert.deepEqual(
    where,
    { owner: { legacySqliteId: 7 } },
    "where must be { owner: { legacySqliteId: 7 } }"
  );
});

test("listForLegacyOwner: coerces string legacyUserId to Number", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listForLegacyOwner("42");
  const { where } = calls[0].args;
  assert.strictEqual(where.owner.legacySqliteId, 42);
  assert.strictEqual(typeof where.owner.legacySqliteId, "number");
});

test("listForLegacyOwner: orders by createdAt desc", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listForLegacyOwner("7");
  const { orderBy } = calls[0].args;
  assert.ok(
    Array.isArray(orderBy) ? orderBy[0].createdAt === "desc" : orderBy.createdAt === "desc",
    "must order by createdAt desc"
  );
});

test("listForLegacyOwner: includes owner relation", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listForLegacyOwner("7");
  const { include } = calls[0].args;
  assert.ok(include && include.owner, "must include owner");
});

test("listForLegacyOwner: maps Prisma row to same EJS DTO as listForOwner", async () => {
  const row = makePgRow();
  const { repo } = makeRepo({ findMany: [row] });
  const [r] = await repo.listForLegacyOwner("42");
  assert.equal(r.id, "42");
  assert.equal(r.title, "Cement");
  assert.equal(r.cargo_type, "Bulk");
  assert.equal(r.weight, 10.5);
  assert.equal(r.volume, 3.2);
  assert.equal(r.loading_city, "Baku");
  assert.equal(r.unloading_city, "Ganja");
  assert.deepEqual(r.latest_pickup_date, new Date("2026-08-01T00:00:00.000Z"));
  assert.deepEqual(r.created_at, new Date("2026-07-01T12:00:00.000Z"));
  assert.equal(r.user_name, "Ali Mammadov");
  assert.equal(r.user_email, "ali@example.com");
  assert.equal(r.status, "PENDING");
});

// ── deleteForLegacyOwner ──────────────────────────────────────────────────────

test("deleteForLegacyOwner: uses $transaction", async () => {
  const row = makePgRow({ id: "clxabc123", legacySqliteId: 99 });
  const { repo, calls } = makeRepo({ findFirst: row, delete: {} });
  await repo.deleteForLegacyOwner(99, 7);
  assert.ok(calls.some(c => c.method === "$transaction"), "must use $transaction");
});

test("deleteForLegacyOwner: calls findFirst with legacySqliteId AND owner.legacySqliteId", async () => {
  const row = makePgRow({ id: "clxabc123", legacySqliteId: 99 });
  const { repo, calls } = makeRepo({ findFirst: row, delete: {} });
  await repo.deleteForLegacyOwner("99", "7");
  const findCall = calls.find(c => c.method === "cargoPost.findFirst");
  assert.ok(findCall, "must call cargoPost.findFirst");
  assert.deepEqual(findCall.args.where, {
    legacySqliteId: 99,
    owner: { legacySqliteId: 7 },
  });
});

test("deleteForLegacyOwner: coerces string ids to Number for findFirst", async () => {
  const row = makePgRow({ id: "clxabc123", legacySqliteId: 99 });
  const { repo, calls } = makeRepo({ findFirst: row, delete: {} });
  await repo.deleteForLegacyOwner("99", "7");
  const findCall = calls.find(c => c.method === "cargoPost.findFirst");
  assert.strictEqual(typeof findCall.args.where.legacySqliteId, "number");
  assert.strictEqual(typeof findCall.args.where.owner.legacySqliteId, "number");
});

test("deleteForLegacyOwner: returns false and does not delete when row not found", async () => {
  const { repo, calls } = makeRepo({ findFirst: null });
  const result = await repo.deleteForLegacyOwner(99, 7);
  assert.strictEqual(result, false, "must return false when row not found");
  assert.ok(!calls.some(c => c.method === "cargoPost.delete"), "must not call delete when not found");
});

test("deleteForLegacyOwner: returns true when row exists and deletes by found row.id", async () => {
  const row = makePgRow({ id: "clxabc123", legacySqliteId: 99 });
  const { repo, calls } = makeRepo({ findFirst: row, delete: {} });
  const result = await repo.deleteForLegacyOwner(99, 7);
  assert.strictEqual(result, true, "must return true when row exists");
  const deleteCall = calls.find(c => c.method === "cargoPost.delete");
  assert.ok(deleteCall, "must call cargoPost.delete");
  assert.deepEqual(deleteCall.args.where, { id: "clxabc123" }, "must delete by found row.id");
});

test("deleteForLegacyOwner: does not delete by legacySqliteId directly", async () => {
  const row = makePgRow({ id: "clxabc123", legacySqliteId: 99 });
  const { repo, calls } = makeRepo({ findFirst: row, delete: {} });
  await repo.deleteForLegacyOwner(99, 7);
  const deleteCall = calls.find(c => c.method === "cargoPost.delete");
  assert.ok(!deleteCall.args.where.legacySqliteId, "delete must not use legacySqliteId as key");
});

// ── String legacy IDs accepted by update/delete ───────────────────────────────

test("updateAdminStatus: accepts string legacy cargo ID (coerces to Number)", async () => {
  const { repo, calls } = makeRepo({ updateMany: { count: 1 } });
  await assert.doesNotReject(() => repo.updateAdminStatus("42", "APPROVED"));
  const updateCall = calls.find(c => c.method === "cargoPost.updateMany");
  assert.ok(updateCall, "must call cargoPost.updateMany");
  assert.strictEqual(typeof updateCall.args.where.legacySqliteId, "number",
    "legacySqliteId must be coerced to number");
  assert.strictEqual(updateCall.args.where.legacySqliteId, 42);
});

test("deleteForAdmin: accepts string legacy cargo ID (coerces to Number)", async () => {
  const { repo, calls } = makeRepo({ deleteMany: { count: 1 } });
  await assert.doesNotReject(() => repo.deleteForAdmin("99"));
  const deleteCall = calls.find(c => c.method === "cargoPost.deleteMany");
  assert.ok(deleteCall, "must call cargoPost.deleteMany");
  assert.strictEqual(typeof deleteCall.args.where.legacySqliteId, "number",
    "legacySqliteId must be coerced to number");
  assert.strictEqual(deleteCall.args.where.legacySqliteId, 99);
});

// ── Missing-row no-throw (SQLite no-op parity) ────────────────────────────────

test("updateAdminStatus: returns false (no throw) when row not found", async () => {
  const { repo } = makeRepo({ updateMany: { count: 0 } });
  const result = await assert.doesNotReject(() => repo.updateAdminStatus(9999, "APPROVED"));
  // result is undefined from doesNotReject; just confirm no throw
});

test("updateAdminStatus: uses updateMany so missing row returns count=0 not throw", async () => {
  const { repo, calls } = makeRepo({ updateMany: { count: 0 } });
  await repo.updateAdminStatus(9999, "APPROVED");
  const call = calls.find(c => c.method === "cargoPost.updateMany");
  assert.ok(call, "must call cargoPost.updateMany");
  assert.deepEqual(call.args.where, { legacySqliteId: 9999 });
  assert.strictEqual(call.args.data.legacyAdminStatus, "APPROVED");
  assert.strictEqual(call.args.data.status, "ACTIVE");
});

test("updateAdminStatus: returns false when updateMany count is 0", async () => {
  const { repo } = makeRepo({ updateMany: { count: 0 } });
  const result = await repo.updateAdminStatus(9999, "APPROVED");
  assert.strictEqual(result, false, "must return false when no row updated");
});

test("updateAdminStatus: returns true when updateMany count > 0", async () => {
  const { repo } = makeRepo({ updateMany: { count: 1 } });
  const result = await repo.updateAdminStatus(42, "APPROVED");
  assert.strictEqual(result, true, "must return true when row updated");
});

test("deleteForAdmin: uses deleteMany so missing row returns count=0 not throw", async () => {
  const { repo, calls } = makeRepo({ deleteMany: { count: 0 } });
  await repo.deleteForAdmin(9999);
  const call = calls.find(c => c.method === "cargoPost.deleteMany");
  assert.ok(call, "must call cargoPost.deleteMany");
  assert.deepEqual(call.args.where, { legacySqliteId: 9999 });
});

test("deleteForAdmin: returns false when deleteMany count is 0", async () => {
  const { repo } = makeRepo({ deleteMany: { count: 0 } });
  const result = await repo.deleteForAdmin(9999);
  assert.strictEqual(result, false, "must return false when no row deleted");
});

test("deleteForAdmin: returns true when deleteMany count > 0", async () => {
  const { repo } = makeRepo({ deleteMany: { count: 1 } });
  const result = await repo.deleteForAdmin(42);
  assert.strictEqual(result, true, "must return true when row deleted");
});

// ── listForSessionOwner ───────────────────────────────────────────────────────

test("listForSessionOwner: canonical (non-numeric) sessionUserId calls findMany with where.ownerId", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listForSessionOwner("clxuser999");
  assert.equal(calls[0].method, "cargoPost.findMany");
  assert.equal(calls[0].args.where?.ownerId, "clxuser999");
});

test("listForSessionOwner: canonical sessionUserId does NOT filter by owner.legacySqliteId", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listForSessionOwner("clxuser999");
  const { where } = calls[0].args;
  assert.ok(!where?.owner?.legacySqliteId, "must not use owner.legacySqliteId for canonical id");
});

test("listForSessionOwner: numeric sessionUserId calls findMany with where.owner.legacySqliteId = Number(id)", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listForSessionOwner("7");
  assert.equal(calls[0].method, "cargoPost.findMany");
  assert.deepEqual(calls[0].args.where, { owner: { legacySqliteId: 7 } });
});

test("listForSessionOwner: numeric sessionUserId coerces to Number", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listForSessionOwner("42");
  assert.strictEqual(typeof calls[0].args.where.owner.legacySqliteId, "number");
  assert.strictEqual(calls[0].args.where.owner.legacySqliteId, 42);
});

test("listForSessionOwner: orders by createdAt desc", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listForSessionOwner("clxuser999");
  const { orderBy } = calls[0].args;
  assert.ok(
    Array.isArray(orderBy) ? orderBy[0].createdAt === "desc" : orderBy.createdAt === "desc",
    "must order by createdAt desc"
  );
});

test("listForSessionOwner: includes owner relation", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listForSessionOwner("clxuser999");
  assert.ok(calls[0].args.include?.owner, "must include owner");
});

test("listForSessionOwner: maps Prisma row to EJS DTO", async () => {
  const row = makePgRow();
  const { repo } = makeRepo({ findMany: [row] });
  const [r] = await repo.listForSessionOwner("clxuser999");
  assert.equal(r.id, "42");
  assert.equal(r.title, "Cement");
  assert.equal(r.loading_city, "Baku");
});

// ── deleteForSessionOwner ─────────────────────────────────────────────────────

test("deleteForSessionOwner: canonical sessionUserId uses $transaction", async () => {
  const { repo, calls } = makeRepo({ delete: {} });
  await repo.deleteForSessionOwner(99, "clxuser999");
  assert.ok(calls.some(c => c.method === "$transaction"), "must use $transaction");
});

test("deleteForSessionOwner: canonical sessionUserId calls cargoPost.findFirst with legacySqliteId AND ownerId", async () => {
  const row = makePgRow({ id: "clxabc123", legacySqliteId: 99 });
  const { repo, calls } = makeRepo({ findFirst: row, delete: {} });
  await repo.deleteForSessionOwner(99, "clxuser999");
  const findCall = calls.find(c => c.method === "cargoPost.findFirst");
  assert.ok(findCall, "must call cargoPost.findFirst");
  assert.equal(findCall.args.where.legacySqliteId, 99);
  assert.equal(findCall.args.where.ownerId, "clxuser999");
  assert.ok(!findCall.args.where.owner, "must not use nested owner relation for canonical id");
});

test("deleteForSessionOwner: canonical sessionUserId deletes by found row.id", async () => {
  const row = makePgRow({ id: "clxabc123", legacySqliteId: 99 });
  const { repo, calls } = makeRepo({ findFirst: row, delete: {} });
  const result = await repo.deleteForSessionOwner(99, "clxuser999");
  assert.strictEqual(result, true);
  const deleteCall = calls.find(c => c.method === "cargoPost.delete");
  assert.ok(deleteCall, "must call cargoPost.delete");
  assert.deepEqual(deleteCall.args.where, { id: "clxabc123" });
});

test("deleteForSessionOwner: canonical sessionUserId returns false when row not found", async () => {
  const { repo, calls } = makeRepo({ findFirst: null });
  const result = await repo.deleteForSessionOwner(99, "clxuser999");
  assert.strictEqual(result, false);
  assert.ok(!calls.some(c => c.method === "cargoPost.delete"), "must not call delete when not found");
});

test("deleteForSessionOwner: numeric sessionUserId uses $transaction", async () => {
  const row = makePgRow({ id: "clxabc123", legacySqliteId: 99 });
  const { repo, calls } = makeRepo({ findFirst: row, delete: {} });
  await repo.deleteForSessionOwner(99, "7");
  assert.ok(calls.some(c => c.method === "$transaction"), "must use $transaction");
});

test("deleteForSessionOwner: numeric sessionUserId calls findFirst with legacySqliteId AND owner.legacySqliteId", async () => {
  const row = makePgRow({ id: "clxabc123", legacySqliteId: 99 });
  const { repo, calls } = makeRepo({ findFirst: row, delete: {} });
  await repo.deleteForSessionOwner("99", "7");
  const findCall = calls.find(c => c.method === "cargoPost.findFirst");
  assert.ok(findCall, "must call cargoPost.findFirst");
  assert.deepEqual(findCall.args.where, {
    legacySqliteId: 99,
    owner: { legacySqliteId: 7 },
  });
});

test("deleteForSessionOwner: numeric sessionUserId coerces both ids to Number", async () => {
  const row = makePgRow({ id: "clxabc123", legacySqliteId: 99 });
  const { repo, calls } = makeRepo({ findFirst: row, delete: {} });
  await repo.deleteForSessionOwner("99", "7");
  const findCall = calls.find(c => c.method === "cargoPost.findFirst");
  assert.strictEqual(typeof findCall.args.where.legacySqliteId, "number");
  assert.strictEqual(typeof findCall.args.where.owner.legacySqliteId, "number");
});

test("deleteForSessionOwner: numeric sessionUserId deletes by found row.id", async () => {
  const row = makePgRow({ id: "clxabc123", legacySqliteId: 99 });
  const { repo, calls } = makeRepo({ findFirst: row, delete: {} });
  const result = await repo.deleteForSessionOwner(99, "7");
  assert.strictEqual(result, true);
  const deleteCall = calls.find(c => c.method === "cargoPost.delete");
  assert.deepEqual(deleteCall.args.where, { id: "clxabc123" });
});

test("deleteForSessionOwner: numeric sessionUserId returns false when row not found", async () => {
  const { repo } = makeRepo({ findFirst: null });
  const result = await repo.deleteForSessionOwner(99, "7");
  assert.strictEqual(result, false);
});

// ── createCargo ───────────────────────────────────────────────────────────────
// TDD: these tests must FAIL until createCargo is implemented.

function makeFakePrismaForCreate(overrides = {}) {
  const calls = [];

  const nextval = overrides.nextval ?? 1001;
  const profileRow = "profileRow" in overrides ? overrides.profileRow : { id: "profile-cuid-1" };
  const createdPost = overrides.createdPost ?? {
    id: "post-cuid-1",
    legacySqliteId: nextval,
    cargoName: "Test Cargo",
    cargoType: "General",
    pickupCity: "Baku",
    deliveryCity: "Ganja",
    ownerId: "user-cuid-1",
  };

  const prisma = {
    $queryRaw: async (query) => {
      calls.push({ method: "$queryRaw", query });
      return [{ nextval }];
    },
    cargoOwnerProfile: {
      findFirst: async (args) => {
        calls.push({ method: "cargoOwnerProfile.findFirst", args });
        return profileRow;
      },
    },
    cargoPost: {
      create: async (args) => {
        calls.push({ method: "cargoPost.create", args });
        return createdPost;
      },
      findMany: async (args) => {
        calls.push({ method: "cargoPost.findMany", args });
        return overrides.findMany ?? [];
      },
    },
    image: {
      createMany: async (args) => {
        calls.push({ method: "image.createMany", args });
        return { count: args.data?.length ?? 0 };
      },
    },
    $transaction: async (fn) => {
      calls.push({ method: "$transaction" });
      return fn(prisma);
    },
  };

  return { prisma, calls };
}

function makeCreateRepo(overrides = {}) {
  const { prisma, calls } = makeFakePrismaForCreate(overrides);
  const key = require.resolve("./postgresCargoRepository.js");
  delete require.cache[key];
  const { makeCargoRepository } = require("./postgresCargoRepository.js");
  return { repo: makeCargoRepository(prisma), calls };
}

const SAMPLE_CARGO_INPUT = {
  ownerId: "user-cuid-1",
  title: "Test Cargo",
  cargo_type: "General",
  description: "Test description",
  weight: 5.0,
  quantity: null,
  volume: null,
  length: null,
  width: null,
  height: null,
  loading_city: "Baku",
  loading_address: "Test St 1",
  unloading_city: "Ganja",
  unloading_address: "Main St 2",
  loading_date: null,
  latest_pickup_date: "2026-08-01",
  loading_time: null,
  transport_type: "Truck",
  price: null,
  phone: "+994501234567",
  notes: null,
  needs_loading_help: null,
  needs_unloading_help: null,
  requires_invoice: null,
  round_trip: null,
  imagePaths: [],
};

test("createCargo: method exists on the repository", () => {
  const { repo } = makeCreateRepo();
  assert.equal(typeof repo.createCargo, "function", "createCargo must be a function on the repository");
});

test("createCargo: uses $transaction", async () => {
  const { repo, calls } = makeCreateRepo();
  await repo.createCargo(SAMPLE_CARGO_INPUT);
  assert.ok(calls.some(c => c.method === "$transaction"), "createCargo must wrap work in $transaction");
});

test("createCargo: uses $queryRaw to obtain a PostgreSQL sequence nextval (not MAX+1)", async () => {
  const { repo, calls } = makeCreateRepo({ nextval: 2001 });
  await repo.createCargo(SAMPLE_CARGO_INPUT);
  const rawCall = calls.find(c => c.method === "$queryRaw");
  assert.ok(rawCall, "createCargo must call $queryRaw to get a sequence nextval");
  // The query object is a TemplateStringsArray from Prisma.sql — confirm it was called
});

test("createCargo: resolves CargoOwnerProfile via cargoOwnerProfile.findFirst for ownerId", async () => {
  const { repo, calls } = makeCreateRepo({ profileRow: { id: "profile-abc" } });
  await repo.createCargo(SAMPLE_CARGO_INPUT);
  const profileCall = calls.find(c => c.method === "cargoOwnerProfile.findFirst");
  assert.ok(profileCall, "must look up CargoOwnerProfile by ownerId");
  assert.equal(profileCall.args.where?.userId, "user-cuid-1", "must query by ownerId");
});

test("createCargo: throws when no CargoOwnerProfile found for ownerId", async () => {
  const { repo } = makeCreateRepo({ profileRow: null });
  await assert.rejects(
    () => repo.createCargo(SAMPLE_CARGO_INPUT),
    /CargoOwnerProfile/,
    "must throw with 'CargoOwnerProfile' message when profile not found"
  );
});

test("createCargo: calls cargoPost.create with ownerId equal to input ownerId", async () => {
  const { repo, calls } = makeCreateRepo();
  await repo.createCargo(SAMPLE_CARGO_INPUT);
  const createCall = calls.find(c => c.method === "cargoPost.create");
  assert.ok(createCall, "must call cargoPost.create");
  assert.equal(createCall.args.data?.ownerId, "user-cuid-1", "ownerId must match session user id");
});

test("createCargo: sets legacyAdminStatus to PENDING", async () => {
  const { repo, calls } = makeCreateRepo();
  await repo.createCargo(SAMPLE_CARGO_INPUT);
  const createCall = calls.find(c => c.method === "cargoPost.create");
  assert.equal(createCall.args.data?.legacyAdminStatus, "PENDING");
});

test("createCargo: sets CargoStatus to CANCELLED (PENDING admin → CANCELLED public)", async () => {
  const { repo, calls } = makeCreateRepo();
  await repo.createCargo(SAMPLE_CARGO_INPUT);
  const createCall = calls.find(c => c.method === "cargoPost.create");
  assert.equal(createCall.args.data?.status, "CANCELLED", "new cargo awaiting admin review must be CANCELLED");
});

test("createCargo: assigns legacySqliteId from sequence nextval", async () => {
  const { repo, calls } = makeCreateRepo({ nextval: 3007 });
  await repo.createCargo(SAMPLE_CARGO_INPUT);
  const createCall = calls.find(c => c.method === "cargoPost.create");
  assert.equal(createCall.args.data?.legacySqliteId, 3007, "legacySqliteId must come from sequence nextval");
});

test("createCargo: connects cargoOwnerProfileId from resolved profile", async () => {
  const { repo, calls } = makeCreateRepo({ profileRow: { id: "profile-xyz" } });
  await repo.createCargo(SAMPLE_CARGO_INPUT);
  const createCall = calls.find(c => c.method === "cargoPost.create");
  assert.equal(
    createCall.args.data?.cargoOwnerProfileId,
    "profile-xyz",
    "cargoOwnerProfileId must be taken from resolved profile"
  );
});

test("createCargo: maps loading_city to pickupCity and unloading_city to deliveryCity", async () => {
  const { repo, calls } = makeCreateRepo();
  await repo.createCargo(SAMPLE_CARGO_INPUT);
  const createCall = calls.find(c => c.method === "cargoPost.create");
  assert.equal(createCall.args.data?.pickupCity, "Baku");
  assert.equal(createCall.args.data?.deliveryCity, "Ganja");
});

test("createCargo: maps title to cargoName and cargo_type to cargoType", async () => {
  const { repo, calls } = makeCreateRepo();
  await repo.createCargo(SAMPLE_CARGO_INPUT);
  const createCall = calls.find(c => c.method === "cargoPost.create");
  assert.equal(createCall.args.data?.cargoName, "Test Cargo");
  assert.equal(createCall.args.data?.cargoType, "General");
});

test("createCargo: maps phone to contactPhone", async () => {
  const { repo, calls } = makeCreateRepo();
  await repo.createCargo(SAMPLE_CARGO_INPUT);
  const createCall = calls.find(c => c.method === "cargoPost.create");
  assert.equal(createCall.args.data?.contactPhone, "+994501234567");
});

test("createCargo: maps transport_type to requiredVehicleType", async () => {
  const { repo, calls } = makeCreateRepo();
  await repo.createCargo({ ...SAMPLE_CARGO_INPUT, transport_type: "Refrigerator" });
  const createCall = calls.find(c => c.method === "cargoPost.create");
  assert.equal(createCall.args.data?.requiredVehicleType, "Refrigerator");
});

test("createCargo: creates Image records with category CARGO for each image path", async () => {
  const { repo, calls } = makeCreateRepo();
  const input = { ...SAMPLE_CARGO_INPUT, imagePaths: ["/uploads/a.webp", "/uploads/b.webp"] };
  await repo.createCargo(input);
  const imageCall = calls.find(c => c.method === "image.createMany");
  assert.ok(imageCall, "must call image.createMany when imagePaths are provided");
  assert.equal(imageCall.args.data?.length, 2, "must create one Image per imagePath");
  assert.ok(imageCall.args.data?.every(img => img.category === "CARGO"), "all images must have category CARGO");
  assert.ok(imageCall.args.data?.every(img => img.url), "all images must have a url");
});

test("createCargo: does not call image.createMany when imagePaths is empty", async () => {
  const { repo, calls } = makeCreateRepo();
  await repo.createCargo({ ...SAMPLE_CARGO_INPUT, imagePaths: [] });
  const imageCall = calls.find(c => c.method === "image.createMany");
  assert.equal(imageCall, undefined, "must not call image.createMany when no images");
});

test("createCargo: returns the created CargoPost row", async () => {
  const created = { id: "post-99", legacySqliteId: 5005, cargoName: "Return Me" };
  const { repo } = makeCreateRepo({ createdPost: created });
  const result = await repo.createCargo(SAMPLE_CARGO_INPUT);
  assert.deepEqual(result, created, "createCargo must return the created CargoPost");
});

test("createCargo: does not use MAX(id)+1 (no $queryRaw with MAX)", async () => {
  const { calls } = makeFakePrismaForCreate();
  const key = require.resolve("./postgresCargoRepository.js");
  delete require.cache[key];
  const { makeCargoRepository } = require("./postgresCargoRepository.js");
  const repo = makeCargoRepository(calls._prisma ?? { $queryRaw: async () => [{ nextval: 1 }], cargoPost: { create: async () => ({}) }, cargoOwnerProfile: { findFirst: async () => ({ id: "p" }) }, image: { createMany: async () => ({}) }, $transaction: async (fn) => fn({ $queryRaw: async () => [{ nextval: 1 }], cargoPost: { create: async () => ({}) }, cargoOwnerProfile: { findFirst: async () => ({ id: "p" }) }, image: { createMany: async () => ({}) } }) });
  const src = require("fs").readFileSync(require.resolve("./postgresCargoRepository.js"), "utf8");
  assert.ok(!src.includes("MAX("), "must not use MAX(id)+1 for ID generation");
  assert.ok(!src.includes("MAX(id)"), "must not use MAX(id)+1 for ID generation");
});
