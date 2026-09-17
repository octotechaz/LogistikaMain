import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  inferPhoneCountry,
  isValidInternationalPhone,
  normalizeInternationalPhone,
} from "./phone-validation";

describe("phone-validation", () => {
  it("accepts valid TR numbers", () => {
    assert.equal(isValidInternationalPhone("+905464233871"), true);
    assert.equal(normalizeInternationalPhone("05464233871"), "+905464233871");
    assert.equal(inferPhoneCountry("+905464233871"), "TR");
  });

  it("accepts valid AZ numbers", () => {
    assert.equal(isValidInternationalPhone("+994501234567"), true);
    assert.equal(normalizeInternationalPhone("0501234567"), "+994501234567");
    assert.equal(inferPhoneCountry("+994501234567"), "AZ");
  });

  it("rejects incomplete prefixes", () => {
    assert.equal(isValidInternationalPhone("+994"), false);
    assert.equal(normalizeInternationalPhone("+994"), null);
  });
});
