"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeAzPhone, normalizeInternationalPhone, composeSelectedCountryPhone, validateOtpInputs } = require("./phoneUtils.js");

// ── normalizeAzPhone: acceptance ─────────────────────────────────────────────

test("normalizeAzPhone: 0501234567 → 994501234567", () => {
  assert.equal(normalizeAzPhone("0501234567"), "994501234567");
});

test("normalizeAzPhone: 994501234567 → 994501234567", () => {
  assert.equal(normalizeAzPhone("994501234567"), "994501234567");
});

test("normalizeAzPhone: 501234567 (bare 9 digits) → 994501234567", () => {
  assert.equal(normalizeAzPhone("501234567"), "994501234567");
});

test("normalizeAzPhone: +994501234567 → 994501234567", () => {
  assert.equal(normalizeAzPhone("+994501234567"), "994501234567");
});

test("normalizeInternationalPhone: keeps a selected Turkish international number", () => {
  assert.equal(normalizeInternationalPhone("+90 532 123 45 67"), "905321234567");
});

test("composeSelectedCountryPhone: selected country code is added to a local number", () => {
  assert.equal(composeSelectedCountryPhone("90", "532 123 45 67"), "905321234567");
});

test("composeSelectedCountryPhone: does not duplicate an Azerbaijan code typed or pasted by habit", () => {
  assert.equal(composeSelectedCountryPhone("994", "+994 50 123 45 67"), "994501234567");
});

test("normalizeAzPhone: spaces — 050 123 45 67", () => {
  assert.equal(normalizeAzPhone("050 123 45 67"), "994501234567");
});

test("normalizeAzPhone: hyphens — 050-123-45-67", () => {
  assert.equal(normalizeAzPhone("050-123-45-67"), "994501234567");
});

test("normalizeAzPhone: dots — 050.123.45.67", () => {
  assert.equal(normalizeAzPhone("050.123.45.67"), "994501234567");
});

test("normalizeAzPhone: parens — (050) 123 45 67", () => {
  assert.equal(normalizeAzPhone("(050) 123 45 67"), "994501234567");
});

test("normalizeAzPhone: +994 with separators — +994 (50) 123-45-67", () => {
  assert.equal(normalizeAzPhone("+994 (50) 123-45-67"), "994501234567");
});

// conflict: 994501234567 already in DB, user enters 050 123 45 67 — must normalize to same key
test("normalizeAzPhone: 050 123 45 67 normalizes same as 994501234567", () => {
  assert.equal(normalizeAzPhone("050 123 45 67"), normalizeAzPhone("994501234567"));
});

test("normalizeAzPhone: +994 (50) 123-45-67 normalizes same as 994501234567", () => {
  assert.equal(normalizeAzPhone("+994 (50) 123-45-67"), normalizeAzPhone("994501234567"));
});

// ── normalizeAzPhone: rejection ──────────────────────────────────────────────

test("normalizeAzPhone: rejects empty string", () => {
  assert.throws(() => normalizeAzPhone(""), /malformed/i);
});

test("normalizeAzPhone: rejects alphabetic prefix — abc0501234567", () => {
  assert.throws(() => normalizeAzPhone("abc0501234567"), /malformed/i);
});

test("normalizeAzPhone: rejects alphabetic suffix — 0501234567xyz", () => {
  assert.throws(() => normalizeAzPhone("0501234567xyz"), /malformed/i);
});

test("normalizeAzPhone: rejects double plus — ++994501234567", () => {
  assert.throws(() => normalizeAzPhone("++994501234567"), /malformed/i);
});

test("normalizeAzPhone: rejects plus not at start — 994501234567+", () => {
  assert.throws(() => normalizeAzPhone("994501234567+"), /malformed/i);
});

test("normalizeAzPhone: rejects plus in middle — 994+501234567", () => {
  assert.throws(() => normalizeAzPhone("994+501234567"), /malformed/i);
});

test("normalizeAzPhone: rejects too-short after strip — 050123", () => {
  assert.throws(() => normalizeAzPhone("050123"), /malformed/i);
});

test("normalizeAzPhone: rejects too-long — 99450123456789", () => {
  assert.throws(() => normalizeAzPhone("99450123456789"), /malformed/i);
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

// ── validateOtpInputs: HTTP boundary ─────────────────────────────────────────

test("validateOtpInputs: missing phone returns ok=false", () => {
  const r = validateOtpInputs(undefined);
  assert.equal(r.ok, false);
});

test("validateOtpInputs: empty phone string returns ok=false", () => {
  const r = validateOtpInputs("");
  assert.equal(r.ok, false);
});

test("validateOtpInputs: junk phone returns ok=false before any OTP check", () => {
  const r = validateOtpInputs("abc123");
  assert.equal(r.ok, false);
});

test("validateOtpInputs: valid phone, no otp arg — returns ok=true with canonical phone", () => {
  const r = validateOtpInputs("0501234567");
  assert.equal(r.ok, true);
  assert.equal(r.phone, "994501234567");
});

test("validateOtpInputs: valid phone + valid 6-digit otp — ok=true", () => {
  const r = validateOtpInputs("0501234567", "123456");
  assert.equal(r.ok, true);
  assert.equal(r.phone, "994501234567");
});

test("validateOtpInputs: valid phone + 4-digit otp — ok=false", () => {
  const r = validateOtpInputs("0501234567", "1234");
  assert.equal(r.ok, false);
});

test("validateOtpInputs: valid phone + alpha otp — ok=false", () => {
  const r = validateOtpInputs("0501234567", "12345a");
  assert.equal(r.ok, false);
});

test("validateOtpInputs: valid phone + 7-digit otp — ok=false", () => {
  const r = validateOtpInputs("0501234567", "1234567");
  assert.equal(r.ok, false);
});

test("validateOtpInputs: non-string phone (number) returns ok=false", () => {
  const r = validateOtpInputs(994501234567);
  assert.equal(r.ok, false);
});

test("validateOtpInputs: valid phone + undefined otp skips otp check — ok=true", () => {
  const r = validateOtpInputs("994501234567", undefined);
  assert.equal(r.ok, true);
});
