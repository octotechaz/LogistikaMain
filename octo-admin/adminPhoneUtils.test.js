"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  parseAdminPhones,
  serializeAdminPhones,
  resolveAdminNotifyPhones,
} = require("./adminPhoneUtils");

test("parseAdminPhones: normalizes comma-separated numbers", () => {
  const phones = parseAdminPhones("994501234567, 0509876543; +994 55 111 22 33");
  assert.deepEqual(phones, ["994501234567", "994509876543", "994551112233"]);
});

test("parseAdminPhones: deduplicates and skips invalid entries", () => {
  const phones = parseAdminPhones("994501234567\n994501234567\nabc\n99455");
  assert.deepEqual(phones, ["994501234567"]);
});

test("serializeAdminPhones: stores one phone per line", () => {
  assert.equal(
    serializeAdminPhones(["994501234567", "994509876543"]),
    "994501234567\n994509876543"
  );
});

test("resolveAdminNotifyPhones: uses QR-connected WhatsApp number first", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    async json() {
      return { status: "connected", connectedPhone: "905464233871" };
    },
  });

  try {
    const settingsRepository = {
      getSetting: async () => "994501234567",
    };
    const phones = await resolveAdminNotifyPhones({
      settingsRepository,
      backendUrl: "http://127.0.0.1:4001",
    });
    assert.deepEqual(phones, ["905464233871", "994501234567"]);
  } finally {
    global.fetch = originalFetch;
  }
});
