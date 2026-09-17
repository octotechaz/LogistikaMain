/**
 * Authorization tests for /api/admin/public-categories.
 *
 * Uses the route-owned exported handler factory (makePublicCategoryHandlers)
 * which is the ACTUAL factory used by GET/POST/DELETE in route.ts.
 * Auth is tested via a direct requireAuth stub — no server-only import needed.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";
import { makePublicCategoryHandlers } from "./handlers";
import type { RequireAuthFn } from "./handlers";

function makeRequest(method: string): NextRequest {
  return new NextRequest("http://localhost/api/admin/public-categories", { method });
}

function allowedAuth(): RequireAuthFn {
  return async () => ({ user: { id: 1, role: "ADMIN" }, response: null });
}

function blockedAuth(status: number, code: string, message: string): RequireAuthFn {
  return async () => ({
    user: null,
    response: NextResponse.json(
      { success: false, ok: false, error: { code, message } },
      { status }
    ),
  });
}

const unauthenticated = blockedAuth(401, "UNAUTHENTICATED", "Giriş tələb olunur.");
const forbidden = blockedAuth(403, "FORBIDDEN", "Bu əməliyyat üçün icazəniz yoxdur.");

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET — ADMIN auth gate", () => {
  test("unauthenticated → 401", async () => {
    const { GET } = makePublicCategoryHandlers({ requireAuth: unauthenticated });
    const res = await GET(makeRequest("GET"));
    assert.equal(res.status, 401);
  });

  test("non-admin role → 403", async () => {
    const { GET } = makePublicCategoryHandlers({ requireAuth: forbidden });
    const res = await GET(makeRequest("GET"));
    assert.equal(res.status, 403);
  });

  test("ADMIN → 200", async () => {
    const { GET } = makePublicCategoryHandlers({ requireAuth: allowedAuth() });
    const res = await GET(makeRequest("GET"));
    assert.equal(res.status, 200);
  });

  test("ADMIN with categories → returns data array", async () => {
    const cats = [{ id: "cat_1", label: "Test", iconKey: "box", iconTone: "text-slate-500", sortOrder: 0, isActive: true }];
    const { GET } = makePublicCategoryHandlers({
      requireAuth: allowedAuth(),
      getCategories: () => cats as never,
    });
    const res = await GET(makeRequest("GET"));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.length, 1);
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST — ADMIN auth gate", () => {
  test("unauthenticated → 401", async () => {
    const { POST } = makePublicCategoryHandlers({ requireAuth: unauthenticated });
    const res = await POST(makeRequest("POST"));
    assert.equal(res.status, 401);
  });

  test("non-admin role → 403", async () => {
    const { POST } = makePublicCategoryHandlers({ requireAuth: forbidden });
    const res = await POST(makeRequest("POST"));
    assert.equal(res.status, 403);
  });

  test("ADMIN → attempts category parse (400 on empty body, not 401/403)", async () => {
    const { POST } = makePublicCategoryHandlers({ requireAuth: allowedAuth() });
    const req = new NextRequest("http://localhost/api/admin/public-categories", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    assert.notEqual(res.status, 401);
    assert.notEqual(res.status, 403);
  });

  test("ADMIN with valid body → upsertCategory called, 200", async () => {
    let upserted: unknown = null;
    const { POST } = makePublicCategoryHandlers({
      requireAuth: allowedAuth(),
      upsertCategory: (c) => { upserted = c; },
    });
    const req = new NextRequest("http://localhost/api/admin/public-categories", {
      method: "POST",
      body: JSON.stringify({ id: "cat_x", label: "Freight", iconKey: "truck" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    assert.equal(res.status, 200);
    assert.ok(upserted, "upsertCategory must be called");
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe("DELETE — ADMIN auth gate", () => {
  test("unauthenticated → 401", async () => {
    const { DELETE } = makePublicCategoryHandlers({ requireAuth: unauthenticated });
    const res = await DELETE(makeRequest("DELETE"));
    assert.equal(res.status, 401);
  });

  test("non-admin role → 403", async () => {
    const { DELETE } = makePublicCategoryHandlers({ requireAuth: forbidden });
    const res = await DELETE(makeRequest("DELETE"));
    assert.equal(res.status, 403);
  });

  test("ADMIN → proceeds past auth (no id param → 400, not 401/403)", async () => {
    const { DELETE } = makePublicCategoryHandlers({ requireAuth: allowedAuth() });
    const res = await DELETE(makeRequest("DELETE"));
    assert.notEqual(res.status, 401);
    assert.notEqual(res.status, 403);
  });

  test("ADMIN with id param → deleteCategory called, 200", async () => {
    let deletedId: string | null = null;
    const { DELETE } = makePublicCategoryHandlers({
      requireAuth: allowedAuth(),
      deleteCategory: (id) => { deletedId = id; },
    });
    const req = new NextRequest("http://localhost/api/admin/public-categories?id=cat_x", { method: "DELETE" });
    const res = await DELETE(req);
    assert.equal(res.status, 200);
    assert.equal(deletedId, "cat_x");
  });
});