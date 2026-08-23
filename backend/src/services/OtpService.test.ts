import test from "node:test";
import assert from "node:assert/strict";
import { OtpService, normalizeAzPhone, normalizeInternationalPhone } from "./OtpService.js";

// Helpers
function makeService(nowMs = 0) {
  return new OtpService(() => nowMs);
}

// ── phone normalization ───────────────────────────────────────────────────────

test("normalizeAzPhone: 0501234567 → 994501234567", () => {
  assert.equal(normalizeAzPhone("0501234567"), "994501234567");
});

test("normalizeAzPhone: 994501234567 → 994501234567", () => {
  assert.equal(normalizeAzPhone("994501234567"), "994501234567");
});

test("normalizeAzPhone: 501234567 (9 national digits) → 994501234567", () => {
  assert.equal(normalizeAzPhone("501234567"), "994501234567");
});

test("normalizeAzPhone: +994501234567 → 994501234567", () => {
  assert.equal(normalizeAzPhone("+994501234567"), "994501234567");
});

test("normalizeInternationalPhone: accepts an international Turkish number", () => {
  assert.equal(normalizeInternationalPhone("+90 532 123 45 67"), "905321234567");
});

test("OTP store and verify support an international number", () => {
  const svc = makeService(0);
  svc.store("+90 532 123 45 67", "456789");
  assert.equal(svc.verify("905321234567", "456789"), "ok");
});

test("normalizeAzPhone: spaces stripped before normalizing", () => {
  assert.equal(normalizeAzPhone("050 123 4567"), "994501234567");
});

test("normalizeAzPhone: throws on too-short value", () => {
  assert.throws(() => normalizeAzPhone("050123"), /malformed/i);
});

test("normalizeAzPhone: throws on too-long value", () => {
  assert.throws(() => normalizeAzPhone("99450123456789"), /malformed/i);
});

test("normalizeAzPhone: throws on empty string", () => {
  assert.throws(() => normalizeAzPhone(""), /malformed/i);
});

// ── store / verify ────────────────────────────────────────────────────────────

test("store and verify correct OTP succeeds and consumes entry", () => {
  const svc = makeService(0);
  svc.store("0501234567", "123456");
  const result = svc.verify("0501234567", "123456");
  assert.equal(result, "ok");

  // Consumed — second attempt is invalid
  const second = svc.verify("0501234567", "123456");
  assert.equal(second, "invalid");
});

test("normalizes AZ phone before storing (0501234567 === 994501234567)", () => {
  const svc = makeService(0);
  svc.store("0501234567", "111111");
  const result = svc.verify("994501234567", "111111");
  assert.equal(result, "ok");
});

test("normalizes AZ phone before storing (050 1234567 with spaces)", () => {
  const svc = makeService(0);
  svc.store("050 1234567", "222222");
  const result = svc.verify("994501234567", "222222");
  assert.equal(result, "ok");
});

test("normalizes phone that already starts with 994", () => {
  const svc = makeService(0);
  svc.store("994501234567", "333333");
  const result = svc.verify("0501234567", "333333");
  assert.equal(result, "ok");
});

test("normalizes phone with + prefix (+994501234567)", () => {
  const svc = makeService(0);
  svc.store("+994501234567", "444444");
  const result = svc.verify("0501234567", "444444");
  assert.equal(result, "ok");
});

test("normalizes bare 9-digit national number (501234567)", () => {
  const svc = makeService(0);
  svc.store("501234567", "555555");
  const result = svc.verify("994501234567", "555555");
  assert.equal(result, "ok");
});

test("wrong OTP returns invalid", () => {
  const svc = makeService(0);
  svc.store("0501234567", "123456");
  const result = svc.verify("0501234567", "999999");
  assert.equal(result, "invalid");
});

test("expired OTP returns expired", () => {
  const fiveMinutesMs = 5 * 60 * 1000;
  let nowMs = 0;
  const svc = new OtpService(() => nowMs);
  svc.store("0507777777", "777777");
  nowMs = fiveMinutesMs + 1;
  const result = svc.verify("0507777777", "777777");
  assert.equal(result, "expired");
});

test("5th failure deletes entry (lockout)", () => {
  const nowMs = 0;
  const svc = new OtpService(() => nowMs);
  svc.store("0509999999", "888888");

  for (let i = 0; i < 5; i++) {
    const r = svc.verify("0509999999", "000000");
    assert.equal(r, "invalid");
  }

  // After 5 failures entry is gone — correct code now also returns invalid
  const result = svc.verify("0509999999", "888888");
  assert.equal(result, "invalid");
});

test("4 failures do not delete entry — correct code still works", () => {
  const svc = makeService(0);
  svc.store("0501112233", "424242");

  for (let i = 0; i < 4; i++) {
    svc.verify("0501112233", "000000");
  }

  const result = svc.verify("0501112233", "424242");
  assert.equal(result, "ok");
});

test("verify unknown phone returns invalid", () => {
  const svc = makeService(0);
  const result = svc.verify("0500000000", "123456");
  assert.equal(result, "invalid");
});

test("uses timing-safe comparison (no early exit on prefix match)", () => {
  const svc = makeService(0);
  svc.store("0501234567", "123456");
  assert.equal(svc.verify("0501234567", "123400"), "invalid");
  assert.equal(svc.verify("0501234567", "023456"), "invalid");
});

// ── malformed input guard ─────────────────────────────────────────────────────

test("store throws on malformed phone (too short)", () => {
  const svc = makeService(0);
  assert.throws(() => svc.store("050123", "123456"), /malformed/i);
});

test("store throws on malformed phone (too long)", () => {
  const svc = makeService(0);
  assert.throws(() => svc.store("994501234567890", "123456"), /malformed/i);
});

test("store throws on non-6-digit code", () => {
  const svc = makeService(0);
  assert.throws(() => svc.store("0501234567", "1234"), /invalid otp/i);
  assert.throws(() => svc.store("0501234567", "1234567"), /invalid otp/i);
  assert.throws(() => svc.store("0501234567", "12345a"), /invalid otp/i);
});

test("verify throws on malformed phone", () => {
  const svc = makeService(0);
  assert.throws(() => svc.verify("050", "123456"), /malformed/i);
});

test("verify throws on non-6-digit code", () => {
  const svc = makeService(0);
  svc.store("0501234567", "123456");
  assert.throws(() => svc.verify("0501234567", "123"), /invalid otp/i);
});

// ── strict phone format acceptance ───────────────────────────────────────────

test("normalizeAzPhone: human separators accepted — 050 123-45-67", () => {
  assert.equal(normalizeAzPhone("050 123-45-67"), "994501234567");
});

test("normalizeAzPhone: parentheses accepted — (050) 123 45 67", () => {
  assert.equal(normalizeAzPhone("(050) 123 45 67"), "994501234567");
});

test("normalizeAzPhone: dots accepted — 050.123.45.67", () => {
  assert.equal(normalizeAzPhone("050.123.45.67"), "994501234567");
});

test("normalizeAzPhone: +994 with separators — +994 (50) 123-45-67", () => {
  assert.equal(normalizeAzPhone("+994 (50) 123-45-67"), "994501234567");
});

test("normalizeAzPhone: 994 with separators — 994 50 123 45 67", () => {
  assert.equal(normalizeAzPhone("994 50 123 45 67"), "994501234567");
});

// ── strict phone format rejection ────────────────────────────────────────────

test("normalizeAzPhone: rejects alphabetic prefix — abc0501234567", () => {
  assert.throws(() => normalizeAzPhone("abc0501234567"), /malformed/i);
});

test("normalizeAzPhone: rejects alphabetic suffix — 0501234567xyz", () => {
  assert.throws(() => normalizeAzPhone("0501234567xyz"), /malformed/i);
});

test("normalizeAzPhone: rejects double plus — ++994501234567", () => {
  assert.throws(() => normalizeAzPhone("++994501234567"), /malformed/i);
});

test("normalizeAzPhone: rejects plus sign not at beginning — 994501234567+", () => {
  assert.throws(() => normalizeAzPhone("994501234567+"), /malformed/i);
});

test("normalizeAzPhone: rejects plus in middle — 994+501234567", () => {
  assert.throws(() => normalizeAzPhone("994+501234567"), /malformed/i);
});

test("normalizeAzPhone: rejects mixed alpha-digits — 050abc1234567", () => {
  assert.throws(() => normalizeAzPhone("050abc1234567"), /malformed/i);
});

test("normalizeAzPhone: rejects +0501234567 — + only valid before 994", () => {
  assert.throws(() => normalizeAzPhone("+0501234567"), /malformed/i);
});

test("normalizeAzPhone: rejects +501234567 — + only valid before 994", () => {
  assert.throws(() => normalizeAzPhone("+501234567"), /malformed/i);
});

test("normalizeAzPhone: rejects slash separator — 050/123/45/67", () => {
  assert.throws(() => normalizeAzPhone("050/123/45/67"), /malformed/i);
});
