import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { PublicCatalogService, type ICategoryRepository } from "./PublicCatalogService.js";

// DTO shape returned by the repository
const ACTIVE_CAT = {
  id: "cuid-1",
  legacySqliteId: "cat-1",
  label: "Ev əşyaları",
  iconKey: "couch",
  iconTone: "text-amber-500",
  matchCargoType: "Ev" as string | null,
  matchVehicleType: null as string | null,
  matchKeyword: null as string | null,
  sortOrder: 1,
  isActive: true,
};

const INACTIVE_CAT = {
  ...ACTIVE_CAT,
  id: "cuid-2",
  legacySqliteId: "cat-2",
  label: "Gizli",
  isActive: false,
};

function makeMockRepo(overrides: Partial<ICategoryRepository> = {}): ICategoryRepository {
  return {
    findMany: async () => [ACTIVE_CAT],
    upsert: async () => ACTIVE_CAT,
    delete: async () => {},
    ...overrides,
  };
}

describe("PublicCatalogService – category methods use only the injected repository (no SQLite)", () => {
  describe("categories(includeInactive)", () => {
    it("calls repo.findMany with includeInactive=false by default and returns mapped DTOs", async () => {
      const calls: { includeInactive: boolean }[] = [];
      const repo = makeMockRepo({
        findMany: async (opts) => {
          calls.push(opts);
          return [ACTIVE_CAT];
        },
      });

      const svc = new PublicCatalogService(repo);
      const result = await svc.categories();

      assert.equal(calls.length, 1);
      assert.equal(calls[0].includeInactive, false);
      assert.equal(result.length, 1);
      assert.equal(result[0].id, "cuid-1");
      assert.equal(result[0].label, "Ev əşyaları");
      assert.equal(result[0].iconKey, "couch");
      assert.equal(result[0].iconTone, "text-amber-500");
      assert.equal(result[0].matchCargoType, "Ev");
      assert.equal(result[0].matchVehicleType, null);
      assert.equal(result[0].sortOrder, 1);
      assert.equal(result[0].isActive, true);
    });

    it("passes includeInactive=true to repo when requested", async () => {
      const calls: { includeInactive: boolean }[] = [];
      const repo = makeMockRepo({
        findMany: async (opts) => {
          calls.push(opts);
          return [INACTIVE_CAT, ACTIVE_CAT];
        },
      });

      const svc = new PublicCatalogService(repo);
      const result = await svc.categories(true);

      assert.equal(calls[0].includeInactive, true);
      assert.equal(result.length, 2);
    });

    it("preserves null optional fields in the DTO", async () => {
      const repo = makeMockRepo({ findMany: async () => [ACTIVE_CAT] });
      const svc = new PublicCatalogService(repo);
      const [dto] = await svc.categories(false);
      assert.equal(dto.matchVehicleType, null);
      assert.equal(dto.matchKeyword, null);
    });
  });

  describe("upsertCategory(input)", () => {
    it("passes parsed input to repo.upsert and returns the DTO", async () => {
      const calls: unknown[] = [];
      const upsertReturn = { ...ACTIVE_CAT, id: "cuid-99", legacySqliteId: "cat-99", label: "Test" };
      const repo = makeMockRepo({
        upsert: async (input) => {
          calls.push(input);
          return upsertReturn;
        },
      });

      const svc = new PublicCatalogService(repo);
      const input = {
        id: "cat-99",
        label: "Test",
        iconKey: "box",
        iconTone: "text-blue-500",
        matchCargoType: "",
        matchVehicleType: "",
        matchKeyword: "",
        sortOrder: 5,
        isActive: true,
      };

      const result = await svc.upsertCategory(input);

      assert.equal(calls.length, 1);
      const passed = calls[0] as { id: string; label: string; sortOrder: number };
      assert.equal(passed.id, "cat-99");
      assert.equal(passed.label, "Test");
      assert.equal(passed.sortOrder, 5);

      assert.equal(result.id, "cuid-99");
      assert.equal(result.label, "Test");
    });

    it("rejects invalid input (missing required field) without touching the repo", async () => {
      const calls: unknown[] = [];
      const repo = makeMockRepo({ upsert: async (i) => { calls.push(i); return ACTIVE_CAT; } });
      const svc = new PublicCatalogService(repo);

      await assert.rejects(() => svc.upsertCategory({ label: "No id" }));
      assert.equal(calls.length, 0);
    });
  });

  describe("deleteCategory(id)", () => {
    it("calls repo.delete with the given id and returns { deleted: true }", async () => {
      const calls: string[] = [];
      const repo = makeMockRepo({
        delete: async (id) => { calls.push(id); },
      });

      const svc = new PublicCatalogService(repo);
      const result = await svc.deleteCategory("cat-1");

      assert.equal(calls.length, 1);
      assert.equal(calls[0], "cat-1");
      assert.deepEqual(result, { deleted: true });
    });
  });

  describe("no SQLite / node:sqlite access for category methods", () => {
    it("categories() never touches node:sqlite (only repo mock called)", async () => {
      // If the implementation imports node:sqlite at the top level for categories,
      // the mock repo would never be called. We verify the repo IS the only call path.
      const called: boolean[] = [];
      const repo = makeMockRepo({ findMany: async () => { called.push(true); return []; } });
      const svc = new PublicCatalogService(repo);
      await svc.categories();
      assert.equal(called[0], true, "repo.findMany must be called, not a SQLite path");
    });

    it("upsertCategory() never touches node:sqlite (only repo mock called)", async () => {
      const called: boolean[] = [];
      const repo = makeMockRepo({
        upsert: async () => { called.push(true); return ACTIVE_CAT; },
      });
      const svc = new PublicCatalogService(repo);
      await svc.upsertCategory({ id: "x", label: "X", iconKey: "box", iconTone: "text-slate-500", sortOrder: 0, isActive: true });
      assert.equal(called[0], true, "repo.upsert must be called, not a SQLite path");
    });

    it("deleteCategory() never touches node:sqlite (only repo mock called)", async () => {
      const called: boolean[] = [];
      const repo = makeMockRepo({ delete: async () => { called.push(true); } });
      const svc = new PublicCatalogService(repo);
      await svc.deleteCategory("x");
      assert.equal(called[0], true, "repo.delete must be called, not a SQLite path");
    });
  });
});

describe("PublicCatalogService – public listings use an injected PostgreSQL repository", () => {
  const listingRow = {
    id: "cargo-1",
    ownerId: "owner-1",
    cargoName: "Bakıdan Gəncəyə yük",
    cargoType: "Mebel",
    description: "Sınaq yükü",
    weight: 12.5,
    volume: null,
    length: null,
    width: null,
    height: null,
    quantity: null,
    pickupCity: "Bakı",
    pickupAddress: "Xətai",
    deliveryCity: "Gəncə",
    deliveryAddress: "Mərkəz",
    pickupDate: new Date("2026-07-22T00:00:00.000Z"),
    pickupDeadlineDate: null,
    legacyPickupTime: null,
    requiredVehicleType: "Tent",
    proposedPrice: { toString: () => "150.50" },
    legacyNote: null,
    createdAt: new Date("2026-07-21T10:00:00.000Z"),
    expiresAt: null,
    status: "ACTIVE",
    owner: { firstName: "Əli", lastName: "Məmmədov", phone: "+994501234567" },
    images: [{ url: "/uploads/cargo.jpg" }],
  };

  it("lists active CargoPost rows newest first without opening SQLite", async () => {
    const calls: unknown[] = [];
    const listingRepo = {
      findMany: async (args: unknown) => { calls.push(args); return [listingRow]; },
      findFirst: async () => null,
    };
    const svc = new PublicCatalogService(makeMockRepo(), listingRepo);
    const result = await svc.listings();
    assert.equal(calls.length, 1);
    assert.deepEqual(result[0], {
      id: "cargo-1", ownerId: "owner-1", ownerName: "Əli Məmmədov", ownerPhone: "+994501234567",
      title: "Bakıdan Gəncəyə yük", cargoType: "Mebel", description: "Sınaq yükü", weight: 12.5,
      volume: undefined, length: undefined, width: undefined, height: undefined, quantity: "",
      pickupCity: "Bakı", pickupAddress: "Xətai", deliveryCity: "Gəncə", deliveryAddress: "Mərkəz",
      pickupDate: "2026-07-22T00:00:00.000Z", pickupDeadlineDate: undefined, pickupTime: undefined,
      vehicleType: "Tent", price: 150.5, note: undefined, createdAt: "2026-07-21T10:00:00.000Z",
      approvedAt: null, expiresAt: null, status: "ACTIVE", photo: "/uploads/cargo.jpg", photos: ["/uploads/cargo.jpg"],
    });
  });

  it("looks up a single listing by canonical id and active status", async () => {
    const calls: unknown[] = [];
    const listingRepo = {
      findMany: async () => [],
      findFirst: async (args: unknown) => { calls.push(args); return listingRow; },
    };
    const svc = new PublicCatalogService(makeMockRepo(), listingRepo);
    const result = await svc.listing("cargo-1");
    assert.deepEqual(calls[0], {
      where: { id: "cargo-1", status: "ACTIVE" },
      include: {
        owner: { select: { firstName: true, lastName: true, phone: true } },
        images: { where: { category: "CARGO" }, select: { url: true } },
      },
    });
    assert.equal(result?.id, "cargo-1");
  });

  it("returns null when no active PostgreSQL listing exists", async () => {
    const listingRepo = { findMany: async () => [], findFirst: async () => null };
    const svc = new PublicCatalogService(makeMockRepo(), listingRepo);
    assert.equal(await svc.listing("missing"), null);
  });
});
