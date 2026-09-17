import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalizeLoginPhone,
  isEmailIdentity,
  phoneInterpretations,
  phoneLookupCandidates,
} from "./login-identity";

describe("login-identity", () => {
  it("detects email", () => {
    assert.equal(isEmailIdentity("owner@tranzit.az"), true);
    assert.equal(isEmailIdentity("+994703334455"), false);
  });

  it("canonicalizes AZ numbers", () => {
    assert.equal(canonicalizeLoginPhone("0703334455"), "+994703334455");
    assert.equal(canonicalizeLoginPhone("70 333 44 55"), "+994703334455");
    assert.equal(canonicalizeLoginPhone("+994703334455"), "+994703334455");
  });

  it("canonicalizes TR numbers (not AZ-mangled)", () => {
    assert.equal(canonicalizeLoginPhone("+905464233871"), "+905464233871");
    assert.equal(canonicalizeLoginPhone("05464233871"), "+905464233871");
    assert.equal(canonicalizeLoginPhone("5464233871"), "+905464233871");
    assert.equal(canonicalizeLoginPhone("90 546 423 38 71"), "+905464233871");
    // Must never invent +0546…
    assert.ok(!canonicalizeLoginPhone("05464233871")?.startsWith("+0"));
  });

  it("includes TR + AZ interpretations in candidates", () => {
    const tr = phoneLookupCandidates("05464233871");
    assert.ok(tr.includes("+905464233871"));
    assert.ok(tr.includes("905464233871"));

    const az = phoneLookupCandidates("0501234567");
    assert.ok(az.includes("+994501234567"));
  });

  it("lists multiple valid interpretations for ambiguous local input", () => {
    const list = phoneInterpretations("501234567");
    assert.ok(list.includes("+994501234567"));
    assert.ok(list.length >= 1);
  });
});
