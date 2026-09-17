import test from "node:test";
import assert from "node:assert/strict";

async function importCleanup() {
  return await import("@/lib/stale-auth-cleanup");
}

function makeFakeStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  const calls: Array<{ method: string; args: unknown[] }> = [];
  return {
    store,
    calls,
    getItem(key: string) {
      calls.push({ method: "getItem", args: [key] });
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      calls.push({ method: "setItem", args: [key, value] });
      store[key] = value;
    },
    removeItem(key: string) {
      calls.push({ method: "removeItem", args: [key] });
      delete store[key];
    },
    clear() {
      calls.push({ method: "clear", args: [] });
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };
}

type FakeStorage = ReturnType<typeof makeFakeStorage>;

function withFakeWindow(
  ls: FakeStorage,
  ss: FakeStorage,
  fn: () => void
) {
  const saved = globalThis.window;
  (globalThis as Record<string, unknown>).window = { localStorage: ls, sessionStorage: ss };
  try {
    fn();
  } finally {
    (globalThis as Record<string, unknown>).window = saved;
  }
}

test("clearStaleAuthKeys removes all 3 stale keys from localStorage", async () => {
  const { clearStaleAuthKeys } = await importCleanup();

  const ls = makeFakeStorage({
    "octo_admin_user": "stale-value",
    "loqistika-classifieds-owner-auth": "owner-id-123",
    "loqistika-classifieds-admin-auth": "true",
    "unrelated-key": "keep-me",
  });
  const ss = makeFakeStorage({});

  withFakeWindow(ls, ss, () => {
    clearStaleAuthKeys();

    assert.equal(ls.store["octo_admin_user"], undefined, "octo_admin_user should be removed from localStorage");
    assert.equal(ls.store["loqistika-classifieds-owner-auth"], undefined, "owner-auth should be removed from localStorage");
    assert.equal(ls.store["loqistika-classifieds-admin-auth"], undefined, "admin-auth should be removed from localStorage");
    assert.equal(ls.store["unrelated-key"], "keep-me", "unrelated key must be preserved");
  });
});

test("clearStaleAuthKeys removes all 3 stale keys from sessionStorage", async () => {
  const { clearStaleAuthKeys } = await importCleanup();

  const ls = makeFakeStorage({});
  const ss = makeFakeStorage({
    "octo_admin_user": "session-val",
    "loqistika-classifieds-owner-auth": "owner-x",
    "loqistika-classifieds-admin-auth": "true",
    "another-unrelated": "preserve",
  });

  withFakeWindow(ls, ss, () => {
    clearStaleAuthKeys();

    assert.equal(ss.store["octo_admin_user"], undefined);
    assert.equal(ss.store["loqistika-classifieds-owner-auth"], undefined);
    assert.equal(ss.store["loqistika-classifieds-admin-auth"], undefined);
    assert.equal(ss.store["another-unrelated"], "preserve");
  });
});

test("clearStaleAuthKeys never calls getItem on any storage", async () => {
  const { clearStaleAuthKeys } = await importCleanup();

  const ls = makeFakeStorage({ "octo_admin_user": "v" });
  const ss = makeFakeStorage({ "loqistika-classifieds-admin-auth": "true" });

  withFakeWindow(ls, ss, () => {
    clearStaleAuthKeys();

    assert.equal(ls.calls.filter((c) => c.method === "getItem").length, 0, "localStorage.getItem must never be called");
    assert.equal(ss.calls.filter((c) => c.method === "getItem").length, 0, "sessionStorage.getItem must never be called");
  });
});

test("clearStaleAuthKeys never calls setItem on any storage", async () => {
  const { clearStaleAuthKeys } = await importCleanup();

  const ls = makeFakeStorage({ "octo_admin_user": "v" });
  const ss = makeFakeStorage({});

  withFakeWindow(ls, ss, () => {
    clearStaleAuthKeys();

    assert.equal(ls.calls.filter((c) => c.method === "setItem").length, 0, "localStorage.setItem must never be called");
    assert.equal(ss.calls.filter((c) => c.method === "setItem").length, 0, "sessionStorage.setItem must never be called");
  });
});

test("clearStaleAuthKeys is a no-op when window is undefined", async () => {
  const { clearStaleAuthKeys } = await importCleanup();

  const saved = globalThis.window;
  (globalThis as Record<string, unknown>).window = undefined;
  try {
    assert.doesNotThrow(() => clearStaleAuthKeys());
  } finally {
    (globalThis as Record<string, unknown>).window = saved;
  }
});

test("clearStaleAuthKeys removes only the exact 3 keys, not keys containing their names as substrings", async () => {
  const { clearStaleAuthKeys } = await importCleanup();

  const ls = makeFakeStorage({
    "octo_admin_user_backup": "keep",
    "prefix-loqistika-classifieds-owner-auth": "keep",
    "loqistika-classifieds-admin-auth-v2": "keep",
    "octo_admin_user": "remove",
    "loqistika-classifieds-owner-auth": "remove",
    "loqistika-classifieds-admin-auth": "remove",
  });
  const ss = makeFakeStorage({});

  withFakeWindow(ls, ss, () => {
    clearStaleAuthKeys();

    assert.equal(ls.store["octo_admin_user"], undefined);
    assert.equal(ls.store["loqistika-classifieds-owner-auth"], undefined);
    assert.equal(ls.store["loqistika-classifieds-admin-auth"], undefined);

    assert.equal(ls.store["octo_admin_user_backup"], "keep");
    assert.equal(ls.store["prefix-loqistika-classifieds-owner-auth"], "keep");
    assert.equal(ls.store["loqistika-classifieds-admin-auth-v2"], "keep");
  });
});