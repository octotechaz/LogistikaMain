import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { maskPhoneNumber } from "@/lib/find-user-by-identity";
import { forgotPasswordResetSchema } from "@/lib/validations/auth";

describe("maskPhoneNumber", () => {
  test("masks all but last 4 digits", () => {
    assert.equal(maskPhoneNumber("+994501112233"), "***2233");
    assert.equal(maskPhoneNumber("905464233871"), "***3871");
  });
});

describe("forgotPasswordResetSchema", () => {
  test("requires matching passwords", () => {
    const result = forgotPasswordResetSchema.safeParse({
      identity: "owner@tranzit.az",
      otp: "123456",
      password: "newpassword",
      confirmPassword: "different",
    });
    assert.equal(result.success, false);
  });

  test("accepts valid payload", () => {
    const result = forgotPasswordResetSchema.safeParse({
      identity: "+994501112233",
      otp: "123456",
      password: "newpassword",
      confirmPassword: "newpassword",
    });
    assert.equal(result.success, true);
  });
});
