/**
 * Focused unit tests for env-validation-core.mjs.
 * Run: node --test src/lib/env-validation-core.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateBareDnsHostname,
  validateHttpsBaseOrigin,
  validatePostgresUrl,
  validateCorsAllowlist,
  validateExactPort,
} from "./env-validation-core.mjs";

// ── validateBareDnsHostname ───────────────────────────────────────────────────

describe("validateBareDnsHostname — valid hostnames", () => {
  it("accepts a simple two-label FQDN", () => {
    const r = validateBareDnsHostname("H", "example.com");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.canonical, "example.com");
  });

  it("accepts a three-label FQDN", () => {
    const r = validateBareDnsHostname("H", "portal-logistika.octotech.az");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.canonical, "portal-logistika.octotech.az");
  });

  it("accepts uppercase labels (case-insensitive DNS)", () => {
    const r = validateBareDnsHostname("H", "EXAMPLE.COM");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.canonical, "example.com");
  });

  it("accepts a 63-char label", () => {
    const label = "a".repeat(63);
    const r = validateBareDnsHostname("H", `${label}.com`);
    assert.equal(r.ok, true);
  });

  it("accepts hostnames with digits and hyphens", () => {
    const r = validateBareDnsHostname("H", "my-host-1.example.com");
    assert.equal(r.ok, true);
  });
});

describe("validateBareDnsHostname — invalid: structure violations", () => {
  it("rejects empty string", () => {
    const r = validateBareDnsHostname("H", "");
    assert.equal(r.ok, false);
    assert.ok(r.error.includes("H"), "error must name the key");
  });

  it("rejects whitespace only", () => {
    assert.equal(validateBareDnsHostname("H", "   ").ok, false);
  });

  it("rejects single-label (no dot)", () => {
    assert.equal(validateBareDnsHostname("H", "localhost").ok, false);
  });

  it("rejects scheme prefix", () => {
    assert.equal(validateBareDnsHostname("H", "https://example.com/path").ok, false);
  });

  it("rejects trailing dot", () => {
    assert.equal(validateBareDnsHostname("H", "example.com.").ok, false);
  });

  it("rejects IP literal (IPv4)", () => {
    assert.equal(validateBareDnsHostname("H", "127.0.0.1").ok, false);
  });

  it("rejects port suffix", () => {
    assert.equal(validateBareDnsHostname("H", "example.com:443").ok, false);
  });

  it("rejects path suffix", () => {
    assert.equal(validateBareDnsHostname("H", "example.com/path").ok, false);
  });

  it("rejects underscore in label", () => {
    assert.equal(validateBareDnsHostname("H", "foo_bar.example.com").ok, false);
  });

  it("rejects label starting with hyphen", () => {
    assert.equal(validateBareDnsHostname("H", "-foo.example.com").ok, false);
  });

  it("rejects label ending with hyphen", () => {
    assert.equal(validateBareDnsHostname("H", "foo-.example.com").ok, false);
  });

  it("rejects empty label (double dot)", () => {
    assert.equal(validateBareDnsHostname("H", "foo..example.com").ok, false);
  });

  it("rejects label longer than 63 chars", () => {
    const label = "a".repeat(64);
    assert.equal(validateBareDnsHostname("H", `${label}.com`).ok, false);
  });

  it("rejects total length > 253 chars", () => {
    // Each label is 63 chars + dot; 4 such labels = 255 chars total
    const label = "a".repeat(63);
    const host = [label, label, label, label].join(".");
    assert.ok(host.length > 253);
    assert.equal(validateBareDnsHostname("H", host).ok, false);
  });
});

describe("validateBareDnsHostname — error messages never echo supplied value", () => {
  it("error for scheme-containing input does not echo the value", () => {
    const r = validateBareDnsHostname("PUBLIC_SITE_HOST", "https://evil.example.com/path");
    assert.equal(r.ok, false);
    assert.ok(!r.error.includes("evil.example.com"), "error must not echo supplied value");
    assert.ok(r.error.includes("PUBLIC_SITE_HOST"), "error must name the key");
  });

  it("error for underscore input does not echo the value", () => {
    const r = validateBareDnsHostname("ADMIN_HOST", "foo_bar.example.com");
    assert.equal(r.ok, false);
    assert.ok(!r.error.includes("foo_bar"), "error must not echo supplied value");
  });
});

// ── validateHttpsBaseOrigin — port and DNS hostname checks ─────────────────────

describe("validateHttpsBaseOrigin — explicit port rejection", () => {
  it("rejects HTTPS origin with explicit non-default port", () => {
    const r = validateHttpsBaseOrigin("NEXTAUTH_URL", "https://example.com:8443");
    assert.equal(r.ok, false);
  });

  it("rejects HTTPS origin with explicit port 443", () => {
    const r = validateHttpsBaseOrigin("NEXTAUTH_URL", "https://example.com:443");
    assert.equal(r.ok, false);
  });

  it("accepts HTTPS origin without port", () => {
    const r = validateHttpsBaseOrigin("NEXTAUTH_URL", "https://example.com");
    assert.equal(r.ok, true);
  });
});

describe("validateHttpsBaseOrigin — IP literal rejection", () => {
  it("rejects IPv4 literal as HTTPS origin hostname", () => {
    const r = validateHttpsBaseOrigin("NEXTAUTH_URL", "https://1.2.3.4");
    assert.equal(r.ok, false);
  });
});

describe("validateHttpsBaseOrigin — error messages never echo supplied value", () => {
  it("does not echo the URL value for HTTP scheme error", () => {
    const r = validateHttpsBaseOrigin("NEXTAUTH_URL", "http://evil.example.com");
    assert.equal(r.ok, false);
    assert.ok(!r.error.includes("evil.example.com"), "error must not echo supplied URL");
    assert.ok(r.error.includes("NEXTAUTH_URL"), "error must name the key");
  });
});

// ── validatePostgresUrl — hostname and pathname checks ────────────────────────

describe("validatePostgresUrl — empty hostname rejected", () => {
  it("rejects URL with empty hostname (file-path style)", () => {
    const r = validatePostgresUrl("postgresql:///mydb");
    assert.equal(r.ok, false);
  });
});

describe("validatePostgresUrl — pathname validation", () => {
  it("rejects URL with only / as pathname (no database name)", () => {
    const r = validatePostgresUrl("postgresql://host/");
    assert.equal(r.ok, false);
  });

  it("rejects URL with empty pathname", () => {
    const r = validatePostgresUrl("postgresql://host");
    assert.equal(r.ok, false);
  });

  it("accepts URL with non-empty database pathname", () => {
    const r = validatePostgresUrl("postgresql://user:pass@host:5432/mydb");
    assert.equal(r.ok, true);
  });
});

describe("validatePostgresUrl — fragment rejection", () => {
  it("rejects URL with fragment", () => {
    const r = validatePostgresUrl("postgresql://host/mydb#fragment");
    assert.equal(r.ok, false);
  });
});

describe("validatePostgresUrl — error messages never echo supplied value", () => {
  it("does not echo the URL in the error message", () => {
    const r = validatePostgresUrl("mysql://user:pass@host/db");
    assert.equal(r.ok, false);
    assert.ok(!r.error.includes("mysql://"), "error must not echo the supplied URL");
    assert.ok(!r.error.includes("user:pass"), "error must not echo credentials");
  });
});

// ── validateCorsAllowlist — error messages never echo raw entries ─────────────

describe("validateCorsAllowlist — error messages never echo raw entries", () => {
  it("does not echo an unrecognized host in the error", () => {
    const r = validateCorsAllowlist("https://evil.example.com", ["trusted.com"]);
    assert.equal(r.ok, false);
    assert.ok(!r.error.includes("evil.example.com"), "error must not echo unrecognized hostname");
  });

  it("does not echo a malformed entry in the error", () => {
    const r = validateCorsAllowlist("not-an-origin", ["trusted.com"]);
    assert.equal(r.ok, false);
    assert.ok(!r.error.includes("not-an-origin"), "error must not echo the raw entry");
  });
});

// ── validateExactPort — error messages never echo supplied value ──────────────

describe("validateExactPort — error messages never echo supplied value", () => {
  it("does not echo the supplied port value in the error", () => {
    const r = validateExactPort("OCTO_ADMIN_PORT", 9999, 3005);
    assert.equal(r.ok, false);
    assert.ok(!r.error.includes("9999"), "error must not echo supplied port value");
    assert.ok(r.error.includes("OCTO_ADMIN_PORT"), "error must name the key");
  });
});

// ── validateBareDnsHostname — return canonical lowercase ──────────────────────

describe("validateBareDnsHostname — returns canonical lowercase", () => {
  it("returns ok:true and canonical lowercase hostname for mixed-case input", () => {
    const r = validateBareDnsHostname("H", "PORTAL.OCTOTECH.AZ");
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.canonical, "portal.octotech.az");
    }
  });
});

// ── host distinctness ─────────────────────────────────────────────────────────

// NOTE: host distinctness is validated in resolveEnv (env.ts); these