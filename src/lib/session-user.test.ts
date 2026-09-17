import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  fetchSessionUser,
  fetchLegacySessionUser,
  type SessionUser,
  type LegacySessionUser
} from "@/lib/session-user";

// --- fetchSessionUser ---

test("fetchSessionUser returns user on 200 with valid payload", async () => {
  const expected: SessionUser = {
    id: "u1",
    firstName: "Ali",
    lastName: "Veli",
    email: "ali@example.com",
    phone: "+994501234567",
    role: "CARRIER"
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      json: async () => ({ data: { user: expected } })
    } as Response);

  const result = await fetchSessionUser();
  assert.deepEqual(result, expected);
  globalThis.fetch = originalFetch;
});

test("fetchSessionUser returns null on 401", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false } as Response);

  const result = await fetchSessionUser();
  assert.equal(result, null);
  globalThis.fetch = originalFetch;
});

test("fetchSessionUser returns null on network error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network failure");
  };

  const result = await fetchSessionUser();
  assert.equal(result, null);
  globalThis.fetch = originalFetch;
});

test("fetchSessionUser returns null when data.user is missing", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      json: async () => ({ data: {} })
    } as Response);

  const result = await fetchSessionUser();
  assert.equal(result, null);
  globalThis.fetch = originalFetch;
});

// --- fetchLegacySessionUser ---

test("fetchLegacySessionUser returns user on 200 with valid payload", async () => {
  const expected: LegacySessionUser = {
    id: "42",
    name: "Fuad Hüseynov",
    email: "fuad@example.com",
    role: "CARRIER",
    profile_picture: null
  };

  const originalFetch = globalThis.fetch;
  let capturedUrl: string | undefined;
  let capturedInit: RequestInit | undefined;
  globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(url);
    capturedInit = init;
    return { ok: true, json: async () => ({ user: expected }) } as Response;
  };

  const result = await fetchLegacySessionUser();
  assert.deepEqual(result, expected);
  assert.equal(capturedUrl, "/dashboard/session-user");
  assert.equal(capturedInit?.credentials, "include");
  assert.equal(capturedInit?.cache, "no-store");
  globalThis.fetch = originalFetch;
});

test("fetchLegacySessionUser returns null on 401", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false } as Response);

  const result = await fetchLegacySessionUser();
  assert.equal(result, null);
  globalThis.fetch = originalFetch;
});

test("fetchLegacySessionUser returns null on network error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network failure");
  };

  const result = await fetchLegacySessionUser();
  assert.equal(result, null);
  globalThis.fetch = originalFetch;
});

test("fetchLegacySessionUser returns null when user field is missing", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({ ok: true, json: async () => ({}) } as Response);

  const result = await fetchLegacySessionUser();
  assert.equal(result, null);
  globalThis.fetch = originalFetch;
});

test("fetchLegacySessionUser returns null when required fields are malformed", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      json: async () => ({ user: { id: "1", name: 42, email: "x@x.com", role: "USER" } })
    } as Response);

  const result = await fetchLegacySessionUser();
  assert.equal(result, null);
  globalThis.fetch = originalFetch;
});

test("fetchLegacySessionUser normalizes numeric id to string", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      json: async () => ({
        user: { id: 7, name: "Test", email: "t@t.com", role: "USER", profile_picture: null }
      })
    } as Response);

  const result = await fetchLegacySessionUser();
  assert.ok(result !== null);
  assert.equal(typeof result!.id, "string");
  assert.equal(result!.id, "7");
  globalThis.fetch = originalFetch;
});

test("fetchLegacySessionUser returns user with profile_picture set", async () => {
  const expected: LegacySessionUser = {
    id: "99",
    name: "Admin User",
    email: "admin@tranzit.az",
    role: "ADMIN",
    profile_picture: "https://cdn.example.com/avatar.jpg"
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      json: async () => ({ user: expected })
    } as Response);

  const result = await fetchLegacySessionUser();
  assert.deepEqual(result, expected);
  globalThis.fetch = originalFetch;
});

// --- Source invariant: no banned cookie identifiers in first-party runtime files ---

test("no octo_user_data, octo_admin_user, or document.cookie in first-party runtime source", () => {
  // octo_admin_user is allowed only in stale-auth-cleanup.ts (and its test file).
  // octo_user_data and document.cookie are banned everywhere in runtime source.
  type BannedRule = { token: string; allowedFiles?: string[] };
  const BANNED: BannedRule[] = [
    { token: "octo_user_data" },
    {
      token: "octo_admin_user",
      allowedFiles: ["src/lib/stale-auth-cleanup.ts", "src/lib/stale-auth-cleanup.test.ts"]
    },
    { token: "document.cookie" }
  ];
  const PROJECT_ROOT = path.resolve(import.meta.dirname ?? __dirname, "../..");

  // Assertion 1: the Next runtime src directory must exist (proves scanner is pointed correctly)
  const srcDir = path.join(PROJECT_ROOT, "src");
  assert.ok(
    fs.existsSync(srcDir),
    `Scanner src dir does not exist: ${srcDir} — PROJECT_ROOT is wrong (PROJECT_ROOT=${PROJECT_ROOT})`
  );

  // Assertion 2: the scanner must collect the known file session-user.ts
  const knownFile = path.join(PROJECT_ROOT, "src", "lib", "session-user.ts");
  assert.ok(
    fs.existsSync(knownFile),
    `Known Next runtime file not found: ${knownFile} — PROJECT_ROOT is wrong (PROJECT_ROOT=${PROJECT_ROOT})`
  );

  function isTestFile(filePath: string): boolean {
    return (
      filePath.includes(".test.") ||
      filePath.includes(".spec.") ||
      filePath.includes("__tests__")
    );
  }

  function collectFiles(dir: string, exts: string[]): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...collectFiles(full, exts));
      } else if (exts.some(e => entry.name.endsWith(e))) {
        results.push(full);
      }
    }
    return results;
  }

  const files = [
    ...collectFiles(path.join(PROJECT_ROOT, "src"), [".ts", ".tsx"]),
    ...collectFiles(path.join(PROJECT_ROOT, "octo-admin"), [".js"])
  ].filter(f => !isTestFile(f));

  assert.ok(
    files.includes(knownFile),
    `Known file not found in collected file list: ${knownFile}`
  );

  const violations: string[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const rel = path.relative(PROJECT_ROOT, file);
    for (const rule of BANNED) {
      if (!content.includes(rule.token)) continue;
      if (rule.allowedFiles?.includes(rel)) continue;
      violations.push(`${path.relative(PROJECT_ROOT, file)}: contains "${rule.token}"`);
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Banned cookie identifiers found in first-party runtime files:\n${violations.join("\n")}`
  );
});