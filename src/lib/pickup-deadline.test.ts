import assert from "node:assert/strict";
import test from "node:test";
import {
  addDaysToDateString,
  calculateExpiresAtFromPickupDeadline,
  derivePickupDeadlineFromLegacyDuration,
  getBakuTodayDateString,
  getMaxPickupDeadlineDateString,
  normalizePickupDeadlineDateValue,
  pickupDeadlineMaxRangeMessage,
  pickupDeadlinePastMessage,
  pickupDeadlineRequiredMessage,
  validatePickupDeadlineDateValue
} from "@/lib/pickup-deadline";

test("normalizes date strings and ISO dates", () => {
  assert.equal(normalizePickupDeadlineDateValue("2026-07-10"), "2026-07-10");
  assert.equal(
    normalizePickupDeadlineDateValue("2026-07-10T14:25:00.000Z"),
    "2026-07-10"
  );
});

test("returns baku today and max date in allowed range", () => {
  const baseDate = new Date("2026-07-10T08:00:00.000Z");

  assert.equal(getBakuTodayDateString(baseDate), "2026-07-10");
  assert.equal(getMaxPickupDeadlineDateString(baseDate), "2026-08-09");
});

test("validates required, past and too-far future dates", () => {
  const baseDate = new Date("2026-07-10T08:00:00.000Z");

  assert.equal(validatePickupDeadlineDateValue("", baseDate), pickupDeadlineRequiredMessage);
  assert.equal(
    validatePickupDeadlineDateValue("2026-07-09", baseDate),
    pickupDeadlinePastMessage
  );
  assert.equal(
    validatePickupDeadlineDateValue("2026-08-10", baseDate),
    pickupDeadlineMaxRangeMessage
  );
  assert.equal(validatePickupDeadlineDateValue("2026-08-09", baseDate), null);
});

test("calculates expiresAt as next day midnight in Asia/Baku", () => {
  const expiresAt = calculateExpiresAtFromPickupDeadline("2026-07-20");

  assert.equal(expiresAt.toISOString(), "2026-07-20T20:00:00.000Z");
});

test("legacy duration derives a safe pickup deadline date", () => {
  assert.equal(
    derivePickupDeadlineFromLegacyDuration("2026-07-10T12:00:00.000Z", 10),
    "2026-07-19"
  );
  assert.equal(addDaysToDateString("2026-07-10", 30), "2026-08-09");
});
