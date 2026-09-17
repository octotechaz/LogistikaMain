"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// ── Fake Prisma builder ───────────────────────────────────────────────────────

function makeFakePrisma(overrides = {}) {
  const calls = [];

  const appSetting = {
    findUnique: async (args) => {
      calls.push({ method: "appSetting.findUnique", args });
      return overrides.findUnique ?? null;
    },
    upsert: async (args) => {
      calls.push({ method: "appSetting.upsert", args });
      return overrides.upsert ?? { key: args.where.key, value: args.update.value };
    },
  };

  const prisma = {
    appSetting,
    $transaction: async (fn) => {
      calls.push({ method: "$transaction" });
      return fn(prisma);
    },
  };

  return { prisma, calls };
}

function makeRepo(overrides = {}) {
  const { prisma, calls } = makeFakePrisma(overrides);
  const key = require.resolve("./postgresSettingsRepository.js");
  delete require.cache[key];
  const { makeSettingsRepository } = require("./postgresSettingsRepository.js");
  return { repo: makeSettingsRepository(prisma), calls };
}

// ── getSetting ────────────────────────────────────────────────────────────────

test("getSetting returns default when no row exists", async () => {
  const { repo } = makeRepo({ findUnique: null });
  const value = await repo.getSetting("whatsapp_admin_phone", "994500000000");
  assert.equal(value, "994500000000");
});

test("getSetting returns stored value when row exists", async () => {
  const { repo } = makeRepo({ findUnique: { key: "whatsapp_admin_phone", value: "994551234567" } });
  const value = await repo.getSetting("whatsapp_admin_phone", "994500000000");
  assert.equal(value, "994551234567");
});

test("getSetting queries by the correct key", async () => {
  const { repo, calls } = makeRepo({ findUnique: null });
  await repo.getSetting("whatsapp_admin_phone", "994500000000");
  const [call] = calls;
  assert.equal(call.method, "appSetting.findUnique");
  assert.deepEqual(call.args.where, { key: "whatsapp_admin_phone" });
});

test("getSetting with no default arg returns null when missing", async () => {
  const { repo } = makeRepo({ findUnique: null });
  const value = await repo.getSetting("nonexistent_key");
  assert.equal(value, null);
});

// ── setSetting ────────────────────────────────────────────────────────────────

test("setSetting calls upsert with correct key and value", async () => {
  const { repo, calls } = makeRepo();
  await repo.setSetting("whatsapp_admin_phone", "994551234567");
  const upsertCall = calls.find((c) => c.method === "appSetting.upsert");
  assert.ok(upsertCall, "upsert must be called");
  assert.deepEqual(upsertCall.args.where, { key: "whatsapp_admin_phone" });
  assert.equal(upsertCall.args.update.value, "994551234567");
  assert.equal(upsertCall.args.create.key, "whatsapp_admin_phone");
  assert.equal(upsertCall.args.create.value, "994551234567");
});

test("setSetting is wrapped in a $transaction", async () => {
  const { repo, calls } = makeRepo();
  await repo.setSetting("whatsapp_admin_phone", "994551234567");
  const txCall = calls.find((c) => c.method === "$transaction");
  assert.ok(txCall, "$transaction must be called");
});

test("setSetting returns the upserted value", async () => {
  const { repo } = makeRepo({ upsert: { key: "whatsapp_admin_phone", value: "994551234567" } });
  const result = await repo.setSetting("whatsapp_admin_phone", "994551234567");
  assert.equal(result, "994551234567");
});

test("setSetting does not import sqlite", () => {
  const key = require.resolve("./postgresSettingsRepository.js");
  delete require.cache[key];
  // Load the module source and check it contains no sqlite reference
  const src = require("fs").readFileSync(require.resolve("./postgresSettingsRepository.js"), "utf8");
  assert.ok(!src.includes("sqlite"), "repository must not reference sqlite");
  assert.ok(!src.includes("better-sqlite3"), "repository must not require better-sqlite3");
});