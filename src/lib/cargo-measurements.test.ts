import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateVolumeFromDimensions,
  formatDimensions,
  formatQuantity,
  formatVolume,
  normalizeQuantityValue,
  resolveVolumeValue,
  validateCargoMeasurements
} from "@/lib/cargo-measurements";

test("quantity only is valid", () => {
  const result = validateCargoMeasurements({ quantity: "10" });

  assert.equal(result.canSubmit, true);
  assert.equal(result.quantityValid, true);
  assert.equal(result.volumeValid, false);
  assert.equal(result.quantity, 10);
  assert.equal(result.volume, null);
});

test("full dimensions calculate volume and allow submit", () => {
  const result = validateCargoMeasurements({
    length: "2",
    width: "1.5",
    height: "1"
  });

  assert.equal(result.canSubmit, true);
  assert.equal(result.volumeValid, true);
  assert.equal(result.volume, 3);
  assert.equal(formatVolume(result.volume), "3");
});

test("comma decimals are normalized", () => {
  const result = validateCargoMeasurements({
    length: "1,25",
    width: "2",
    height: "1,2"
  });

  assert.equal(result.volume, 3);
  assert.equal(formatDimensions(result.length, result.width, result.height), "1.25 × 2 × 1.2 m");
});

test("partial dimensions without quantity are rejected", () => {
  const result = validateCargoMeasurements({
    length: "2",
    width: "1.5"
  });

  assert.equal(result.canSubmit, false);
  assert.equal(
    result.formError,
    "Həcmin hesablanması üçün uzunluq, en və hündürlük sahələrinin hamısını doldurun və ya Say daxil edin."
  );
});

test("empty quantity and empty dimensions are rejected", () => {
  const result = validateCargoMeasurements({});

  assert.equal(result.canSubmit, false);
  assert.equal(
    result.formError,
    "Say daxil edin və ya yükün uzunluq, en və hündürlük ölçülərini tam doldurun."
  );
});

test("invalid quantity is rejected", () => {
  const zeroResult = validateCargoMeasurements({ quantity: "0" });
  const negativeResult = validateCargoMeasurements({ quantity: "-4" });

  assert.equal(zeroResult.canSubmit, false);
  assert.equal(negativeResult.canSubmit, false);
  assert.equal(zeroResult.quantityError, "Say sahəsinə 1 və ya daha böyük tam ədəd daxil edin.");
  assert.equal(negativeResult.quantityError, "Say sahəsinə 1 və ya daha böyük tam ədəd daxil edin.");
});

test("dimension zero is rejected when quantity is missing", () => {
  const result = validateCargoMeasurements({
    length: "2",
    width: "0",
    height: "1"
  });

  assert.equal(result.canSubmit, false);
  assert.equal(result.widthError, "Dəyər 0-dan böyük olmalıdır.");
});

test("quantity and dimensions can coexist", () => {
  const result = validateCargoMeasurements({
    quantity: "8",
    length: "2",
    width: "1.5",
    height: "1"
  });

  assert.equal(result.canSubmit, true);
  assert.equal(result.quantity, 8);
  assert.equal(result.volume, 3);
});

test("volume clears when one dimension is removed", () => {
  assert.equal(calculateVolumeFromDimensions("2", "1.5", "1"), 3);
  assert.equal(calculateVolumeFromDimensions("2", "", "1"), null);
});

test("helper formatting and resolution preserve expected display values", () => {
  assert.equal(formatQuantity("20"), "20 ədəd");
  assert.equal(formatQuantity("10 ton"), "");
  assert.equal(normalizeQuantityValue("4 ədəd"), "4");
  assert.equal(normalizeQuantityValue("12 palet"), "");
  assert.equal(resolveVolumeValue("", "2", "1.5", "1"), 3);
  assert.equal(resolveVolumeValue("3.125", "", "", ""), 3.125);
});
