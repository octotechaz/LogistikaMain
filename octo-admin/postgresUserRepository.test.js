"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

// ── Fake Prisma builder ───────────────────────────────────────────────────────

function makeFakePrisma(overrides = {}) {
  const calls = [];

  const user = {
    findFirst: async (args) => {
      calls.push({ method: "user.findFirst", args });
      return overrides.findFirst ?? null;
    },
    findUnique: async (args) => {
      calls.push({ method: "user.findUnique", args });
      return overrides.findUnique ?? null;
    },
    findMany: async (args) => {
      calls.push({ method: "user.findMany", args });
      return overrides.findMany ?? [];
    },
    create: async (args) => {
      calls.push({ method: "user.create", args });
      return overrides.userCreate ?? args.data ?? {};
    },
  };

  const cargoOwnerProfile = {
    create: async (args) => {
      calls.push({ method: "cargoOwnerProfile.create", args });
      return overrides.profileCreate ?? args.data ?? {};
    },
  };

  const prisma = {
    user,
    cargoOwnerProfile,
    $transaction: async (fn) => {
      calls.push({ method: "$transaction" });
      return fn(prisma);
    },
  };

  return { prisma, calls };
}

function makeRepo(overrides = {}) {
  const { prisma, calls } = makeFakePrisma(overrides);
  const key = require.resolve("./postgresUserRepository.js");
  delete require.cache[key];
  const { makeUserRepository } = require("./postgresUserRepository.js");
  return { repo: makeUserRepository(prisma), calls };
}

// ── Sample Prisma User row ────────────────────────────────────────────────────

function makePgUser(overrides = {}) {
  return {
    id: "clxuser001",
    firstName: "Ali",
    lastName: "Mammadov",
    email: "ali@example.com",
    phone: "+994501234567",
    passwordHash: "$2b$10$examplehashvalue",
    role: "CARGO_OWNER",
    status: "ACTIVE",
    profileImage: "https://cdn.example.com/ali.jpg",
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    ...overrides,
  };
}

// ── DTO shape ─────────────────────────────────────────────────────────────────

test("findLoginUser: maps Prisma User to legacy DTO with correct fields", async () => {
  const pgUser = makePgUser();
  const { repo } = makeRepo({ findFirst: pgUser });
  const dto = await repo.findLoginUser("ali@example.com");

  assert.ok(dto !== null, "must return a DTO when user found");
  assert.equal(dto.id, "clxuser001", "id must be the canonical PG string id");
  assert.equal(dto.name, "Ali Mammadov", "name must be trimmed first + last");
  assert.equal(dto.email, "ali@example.com");
  assert.equal(dto.phone, "+994501234567");
  assert.equal(dto.role, "USER", "CARGO_OWNER must map to USER");
  assert.equal(dto.profile_picture, "https://cdn.example.com/ali.jpg", "profile_picture must be profileImage");
  assert.deepEqual(dto.created_at, new Date("2026-01-15T10:00:00.000Z"));
  assert.equal(dto.password, "$2b$10$examplehashvalue", "password must be the passwordHash value");
});

test("findLoginUser: DTO must not expose passwordHash key", async () => {
  const pgUser = makePgUser();
  const { repo } = makeRepo({ findFirst: pgUser });
  const dto = await repo.findLoginUser("ali@example.com");
  assert.ok(!("passwordHash" in dto), "DTO must not have a passwordHash field");
});

test("findLoginUser: role CARRIER stays CARRIER", async () => {
  const pgUser = makePgUser({ role: "CARRIER" });
  const { repo } = makeRepo({ findFirst: pgUser });
  const dto = await repo.findLoginUser("ali@example.com");
  assert.equal(dto.role, "CARRIER");
});

test("findLoginUser: role ADMIN stays ADMIN", async () => {
  const pgUser = makePgUser({ role: "ADMIN" });
  const { repo } = makeRepo({ findFirst: pgUser });
  const dto = await repo.findLoginUser("ali@example.com");
  assert.equal(dto.role, "ADMIN");
});

test("findLoginUser: role DRIVER stays DRIVER", async () => {
  const pgUser = makePgUser({ role: "DRIVER" });
  const { repo } = makeRepo({ findFirst: pgUser });
  const dto = await repo.findLoginUser("ali@example.com");
  assert.equal(dto.role, "DRIVER");
});

test("findLoginUser: role DISPATCHER stays DISPATCHER", async () => {
  const pgUser = makePgUser({ role: "DISPATCHER" });
  const { repo } = makeRepo({ findFirst: pgUser });
  const dto = await repo.findLoginUser("ali@example.com");
  assert.equal(dto.role, "DISPATCHER");
});

test("findLoginUser: name trims trailing space when lastName is empty string", async () => {
  const pgUser = makePgUser({ firstName: "Ali", lastName: "" });
  const { repo } = makeRepo({ findFirst: pgUser });
  const dto = await repo.findLoginUser("ali@example.com");
  assert.equal(dto.name, "Ali");
});

test("findLoginUser: name trims trailing space when lastName is null", async () => {
  const pgUser = makePgUser({ firstName: "Ali", lastName: null });
  const { repo } = makeRepo({ findFirst: pgUser });
  const dto = await repo.findLoginUser("ali@example.com");
  assert.equal(dto.name, "Ali");
});

test("findLoginUser: returns null when user not found", async () => {
  const { repo } = makeRepo({ findFirst: null });
  const dto = await repo.findLoginUser("nobody@example.com");
  assert.strictEqual(dto, null);
});

// ── findLoginUser query shape ─────────────────────────────────────────────────

test("findLoginUser: queries by OR email/phone with exact identifier", async () => {
  const { repo, calls } = makeRepo({ findFirst: null });
  await repo.findLoginUser("ali@example.com");

  const call = calls.find(c => c.method === "user.findFirst");
  assert.ok(call, "must call user.findFirst");
  const { where } = call.args;
  assert.ok(where && Array.isArray(where.OR), "where must have OR array");
  const hasEmail = where.OR.some(c => c.email === "ali@example.com");
  const hasPhone = where.OR.some(c => c.phone === "ali@example.com");
  assert.ok(hasEmail || hasPhone, "OR must include email or phone clause with the identifier");
  assert.ok(hasEmail && hasPhone, "OR must include BOTH email and phone clauses");
});

test("findLoginUser: passes the same identifier to both email and phone in OR", async () => {
  const identifier = "admin@example.com";
  const { repo, calls } = makeRepo({ findFirst: null });
  await repo.findLoginUser(identifier);

  const call = calls.find(c => c.method === "user.findFirst");
  const { where } = call.args;
  const emailClause = where.OR.find(c => "email" in c);
  const phoneClause = where.OR.find(c => "phone" in c);
  assert.ok(emailClause, "must have email clause");
  assert.ok(phoneClause, "must have phone clause");
  assert.equal(emailClause.email, identifier, "email clause must use exact identifier");
  assert.equal(phoneClause.phone, identifier, "phone clause must use exact identifier");
});

test("findLoginUser: canonical phone lookup also accepts a legacy leading-plus PostgreSQL value", async () => {
  const legacyUser = makePgUser({ phone: "+994501234567", role: "ADMIN" });
  const { repo, calls } = makeRepo({ findMany: [legacyUser] });
  const result = await repo.findLoginUser("994501234567");

  const { where } = calls.find(c => c.method === "user.findMany").args;
  assert.equal(result.id, legacyUser.id, "single compatible legacy row must be returned");
  assert.ok(where.OR.some(c => c.phone === "994501234567"), "must query the canonical 994 form");
  assert.ok(where.OR.some(c => c.phone === "+994501234567"), "must query the compatible +994 form");
});

test("findLoginUser: two rows matching canonical and leading-plus phone variants fail closed", async () => {
  const { repo } = makeRepo({
    findMany: [
      makePgUser({ id: "canonical-row", phone: "994501234567" }),
      makePgUser({ id: "legacy-row", phone: "+994501234567" }),
    ],
  });

  assert.equal(await repo.findLoginUser("994501234567"), null);
});

test("findLoginUser: non-AZ canonical phone also accepts a legacy leading-plus value", async () => {
  const legacyUser = makePgUser({ phone: "+905321234567", role: "ADMIN" });
  const { repo, calls } = makeRepo({ findMany: [legacyUser] });
  const result = await repo.findLoginUser("905321234567");
  const { where } = calls.find(c => c.method === "user.findMany").args;
  assert.equal(result.id, legacyUser.id);
  assert.ok(where.OR.some(c => c.phone === "905321234567"));
  assert.ok(where.OR.some(c => c.phone === "+905321234567"));
});

test("findLoginUser: email lookup preserves the exact email clause", async () => {
  const { repo, calls } = makeRepo({ findFirst: null });
  await repo.findLoginUser("admin@example.com");
  const { where } = calls.find(c => c.method === "user.findFirst").args;
  assert.ok(where.OR.some(c => c.email === "admin@example.com"));
});

// ── findSessionUser ───────────────────────────────────────────────────────────

test("findSessionUser: returns legacy DTO for matching id", async () => {
  const pgUser = makePgUser({ id: "clxuser001" });
  const { repo } = makeRepo({ findUnique: pgUser });
  const dto = await repo.findSessionUser("clxuser001");

  assert.ok(dto !== null, "must return a DTO when user found");
  assert.equal(dto.id, "clxuser001");
  assert.equal(dto.name, "Ali Mammadov");
  assert.equal(dto.email, "ali@example.com");
  assert.equal(dto.role, "USER");
  assert.ok(!("passwordHash" in dto), "DTO must not have passwordHash field");
});

test("findSessionUser: returns null when user not found", async () => {
  const { repo } = makeRepo({ findUnique: null });
  const dto = await repo.findSessionUser("nonexistent-id");
  assert.strictEqual(dto, null);
});

test("findSessionUser: queries by canonical id field", async () => {
  const { repo, calls } = makeRepo({ findUnique: null });
  await repo.findSessionUser("clxuser001");

  const call = calls.find(c => c.method === "user.findUnique");
  assert.ok(call, "must call user.findUnique");
  const { where } = call.args;
  assert.ok(where, "must pass where clause");
  assert.equal(where.id, "clxuser001", "must query by canonical id");
});

test("findSessionUser: does not query by email or phone", async () => {
  const { repo, calls } = makeRepo({ findUnique: null });
  await repo.findSessionUser("clxuser001");

  const call = calls.find(c => c.method === "user.findUnique");
  const { where } = call.args;
  assert.ok(!where.email && !where.phone && !where.OR, "must query only by id, not email/phone/OR");
});

// ── listUsers ─────────────────────────────────────────────────────────────────

test("listUsers: returns an array of legacy DTOs", async () => {
  const users = [
    makePgUser({ id: "u1", email: "a@example.com", createdAt: new Date("2026-03-01") }),
    makePgUser({ id: "u2", email: "b@example.com", role: "CARRIER", createdAt: new Date("2026-01-01") }),
  ];
  const { repo } = makeRepo({ findMany: users });
  const result = await repo.listUsers();

  assert.equal(result.length, 2);
  assert.equal(result[0].id, "u1");
  assert.equal(result[1].id, "u2");
  assert.equal(result[1].role, "CARRIER");
});

test("listUsers: returns empty array when no users", async () => {
  const { repo } = makeRepo({ findMany: [] });
  const result = await repo.listUsers();
  assert.deepEqual(result, []);
});

test("listUsers: orders by createdAt desc", async () => {
  const { repo, calls } = makeRepo({ findMany: [] });
  await repo.listUsers();

  const call = calls.find(c => c.method === "user.findMany");
  assert.ok(call, "must call user.findMany");
  const { orderBy } = call.args;
  assert.ok(
    Array.isArray(orderBy)
      ? orderBy[0].createdAt === "desc"
      : orderBy && orderBy.createdAt === "desc",
    "must order by createdAt desc"
  );
});

test("listUsers: DTO rows do not expose passwordHash key", async () => {
  const users = [makePgUser()];
  const { repo } = makeRepo({ findMany: users });
  const result = await repo.listUsers();
  for (const dto of result) {
    assert.ok(!("passwordHash" in dto), "DTO must not have passwordHash field");
  }
});

test("listUsers: maps CARGO_OWNER to USER in returned DTOs", async () => {
  const users = [makePgUser({ role: "CARGO_OWNER" })];
  const { repo } = makeRepo({ findMany: users });
  const [dto] = await repo.listUsers();
  assert.equal(dto.role, "USER");
});

// ── verifyPassword ────────────────────────────────────────────────────────────

test("verifyPassword: returns true for a valid bcryptjs password/hash pair", async () => {
  const plaintext = "MySecretPass!99";
  const hash = await bcrypt.hash(plaintext, 10);
  const { repo } = makeRepo();
  const result = await repo.verifyPassword(plaintext, hash);
  assert.strictEqual(result, true);
});

test("verifyPassword: returns false for an incorrect password", async () => {
  const hash = await bcrypt.hash("correct-password", 10);
  const { repo } = makeRepo();
  const result = await repo.verifyPassword("wrong-password", hash);
  assert.strictEqual(result, false);
});

test("verifyPassword: is compatible with bcryptjs hashes (not native bcrypt)", async () => {
  const hash = await bcrypt.hash("test123", 10);
  assert.ok(hash.startsWith("$2a$") || hash.startsWith("$2b$"), "bcryptjs produces valid hashes");
  const { repo } = makeRepo();
  const result = await repo.verifyPassword("test123", hash);
  assert.strictEqual(result, true, "verifyPassword must handle $2b$ bcryptjs hashes");
});

// ── No SQLite contract ────────────────────────────────────────────────────────

test("module does not import SQLite", () => {
  const fs = require("fs");
  const path = require("path");
  const src = fs.readFileSync(
    path.join(__dirname, "postgresUserRepository.js"),
    "utf8"
  );
  assert.ok(!src.includes("better-sqlite3"), "must not import better-sqlite3");
  assert.ok(
    !src.includes("require('sqlite3')") && !src.includes('require("sqlite3")'),
    "must not import sqlite3"
  );
  assert.ok(!src.includes(".prepare("), "must not use .prepare() (SQLite API)");
});

// ── findIdentityConflict ──────────────────────────────────────────────────────

test("findIdentityConflict: returns matching user when email conflicts", async () => {
  const existing = makePgUser({ id: "clxother", email: "taken@example.com", phone: "+99400000000" });
  const { repo } = makeRepo({ findFirst: existing });
  const result = await repo.findIdentityConflict({ email: "taken@example.com", phone: "+99411111111" });
  assert.ok(result !== null, "must return conflict row when email matches");
  assert.equal(result.id, "clxother");
});

test("findIdentityConflict: returns matching user when phone conflicts", async () => {
  const existing = makePgUser({ id: "clxother", email: "other@example.com", phone: "+99412345678" });
  const { repo } = makeRepo({ findFirst: existing });
  const result = await repo.findIdentityConflict({ email: "new@example.com", phone: "+99412345678" });
  assert.ok(result !== null, "must return conflict row when phone matches");
  assert.equal(result.id, "clxother");
});

test("findIdentityConflict: returns null when no conflict", async () => {
  const { repo } = makeRepo({ findFirst: null });
  const result = await repo.findIdentityConflict({ email: "fresh@example.com", phone: "+99499999999" });
  assert.strictEqual(result, null);
});

test("findIdentityConflict: queries with OR on email and phone", async () => {
  const { repo, calls } = makeRepo({ findFirst: null });
  await repo.findIdentityConflict({ email: "a@example.com", phone: "+99400000001" });
  const call = calls.find(c => c.method === "user.findFirst");
  assert.ok(call, "must call user.findFirst");
  const { where } = call.args;
  assert.ok(where && Array.isArray(where.OR), "where must have OR array");
  const hasEmail = where.OR.some(c => c.email === "a@example.com");
  const hasPhone = where.OR.some(c => c.phone === "+99400000001");
  assert.ok(hasEmail, "OR must include email clause");
  assert.ok(hasPhone, "OR must include phone clause");
});

test("findIdentityConflict: excludes the given canonical id when provided", async () => {
  const { repo, calls } = makeRepo({ findFirst: null });
  await repo.findIdentityConflict({ email: "a@example.com", phone: "+99400000001", excludeId: "clxme123" });
  const call = calls.find(c => c.method === "user.findFirst");
  const { where } = call.args;
  assert.ok(
    where && where.NOT && where.NOT.id === "clxme123",
    "where must include NOT: { id: excludeId }"
  );
});

test("findIdentityConflict: does NOT add NOT clause when excludeId is absent", async () => {
  const { repo, calls } = makeRepo({ findFirst: null });
  await repo.findIdentityConflict({ email: "a@example.com", phone: "+99400000001" });
  const call = calls.find(c => c.method === "user.findFirst");
  const { where } = call.args;
  assert.ok(!where.NOT, "must not add NOT clause when excludeId not supplied");
});

test("findIdentityConflict: returns the raw Prisma row (not a legacy DTO)", async () => {
  const existing = makePgUser({ id: "clxraw", role: "CARGO_OWNER" });
  const { repo } = makeRepo({ findFirst: existing });
  const result = await repo.findIdentityConflict({ email: existing.email, phone: existing.phone });
  assert.equal(result.role, "CARGO_OWNER", "must return raw row, not mapped DTO");
  assert.ok("passwordHash" in result, "raw row must include passwordHash");
});

// ── createLegacyUser ──────────────────────────────────────────────────────────

test("createLegacyUser: uses $transaction", async () => {
  const created = makePgUser({ id: "clxnew01", role: "CARGO_OWNER" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Leyla Aliyeva",
    email: "leyla@example.com",
    phone: "+99450000001",
    passwordHash: "$2b$10$hash",
    role: "USER",
  });
  assert.ok(calls.some(c => c.method === "$transaction"), "must use $transaction");
});

test("createLegacyUser: maps legacy role USER to canonical CARGO_OWNER", async () => {
  const created = makePgUser({ id: "clxnew01", role: "CARGO_OWNER" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Leyla Aliyeva",
    email: "leyla@example.com",
    phone: "+99450000001",
    passwordHash: "$2b$10$hash",
    role: "USER",
  });
  const createCall = calls.find(c => c.method === "user.create");
  assert.ok(createCall, "must call user.create");
  assert.equal(createCall.args.data.role, "CARGO_OWNER", "USER must map to CARGO_OWNER");
});

test("createLegacyUser: maps legacy role ADMIN unchanged", async () => {
  const created = makePgUser({ id: "clxadmin", role: "ADMIN" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Admin User",
    email: "admin@example.com",
    phone: "+99450000002",
    passwordHash: "$2b$10$hash",
    role: "ADMIN",
  });
  const createCall = calls.find(c => c.method === "user.create");
  assert.equal(createCall.args.data.role, "ADMIN");
});

test("createLegacyUser: maps legacy role CARRIER unchanged", async () => {
  const created = makePgUser({ id: "clxcarrier", role: "CARRIER" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Carrier User",
    email: "carrier@example.com",
    phone: "+99450000003",
    passwordHash: "$2b$10$hash",
    role: "CARRIER",
  });
  const createCall = calls.find(c => c.method === "user.create");
  assert.equal(createCall.args.data.role, "CARRIER");
});

test("createLegacyUser: maps legacy role DRIVER unchanged", async () => {
  const created = makePgUser({ id: "clxdriver", role: "DRIVER" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Driver User",
    email: "driver@example.com",
    phone: "+99450000004",
    passwordHash: "$2b$10$hash",
    role: "DRIVER",
  });
  const createCall = calls.find(c => c.method === "user.create");
  assert.equal(createCall.args.data.role, "DRIVER");
});

test("createLegacyUser: maps legacy role DISPATCHER unchanged", async () => {
  const created = makePgUser({ id: "clxdisp", role: "DISPATCHER" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Dispatcher User",
    email: "dispatcher@example.com",
    phone: "+99450000005",
    passwordHash: "$2b$10$hash",
    role: "DISPATCHER",
  });
  const createCall = calls.find(c => c.method === "user.create");
  assert.equal(createCall.args.data.role, "DISPATCHER");
});

test("createLegacyUser: throws for unsupported role", async () => {
  const { repo } = makeRepo();
  await assert.rejects(
    () => repo.createLegacyUser({
      name: "Bad Role",
      email: "bad@example.com",
      phone: "+99450000099",
      passwordHash: "$2b$10$hash",
      role: "SUPERUSER",
    }),
    /unsupported role/i,
    "must throw with 'unsupported role' for unknown legacy role"
  );
});

test("createLegacyUser: throws for empty role string", async () => {
  const { repo } = makeRepo();
  await assert.rejects(
    () => repo.createLegacyUser({
      name: "Bad",
      email: "bad@example.com",
      phone: "+994500",
      passwordHash: "$2b$10$hash",
      role: "",
    }),
    /unsupported role/i
  );
});

test("createLegacyUser: splits name into firstName and lastName", async () => {
  const created = makePgUser({ id: "clxnew01", firstName: "Leyla", lastName: "Aliyeva", role: "CARGO_OWNER" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Leyla Aliyeva",
    email: "leyla@example.com",
    phone: "+99450000001",
    passwordHash: "$2b$10$hash",
    role: "USER",
  });
  const createCall = calls.find(c => c.method === "user.create");
  assert.equal(createCall.args.data.firstName, "Leyla");
  assert.equal(createCall.args.data.lastName, "Aliyeva");
});

test("createLegacyUser: single-word name sets firstName, lastName empty string", async () => {
  const created = makePgUser({ id: "clxmono", firstName: "Leyla", lastName: "", role: "CARGO_OWNER" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Leyla",
    email: "leyla2@example.com",
    phone: "+99450000006",
    passwordHash: "$2b$10$hash",
    role: "USER",
  });
  const createCall = calls.find(c => c.method === "user.create");
  assert.equal(createCall.args.data.firstName, "Leyla");
  assert.equal(createCall.args.data.lastName, "");
});

test("createLegacyUser: multi-word name puts first word in firstName and rest in lastName", async () => {
  const created = makePgUser({ id: "clxmulti", firstName: "Ali", lastName: "Huseyn Mammadov", role: "CARGO_OWNER" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Ali Huseyn Mammadov",
    email: "ali3@example.com",
    phone: "+99450000007",
    passwordHash: "$2b$10$hash",
    role: "USER",
  });
  const createCall = calls.find(c => c.method === "user.create");
  assert.equal(createCall.args.data.firstName, "Ali");
  assert.equal(createCall.args.data.lastName, "Huseyn Mammadov");
});

test("createLegacyUser: throws for empty name", async () => {
  const { repo } = makeRepo();
  await assert.rejects(
    () => repo.createLegacyUser({
      name: "",
      email: "x@example.com",
      phone: "+994500",
      passwordHash: "$2b$10$hash",
      role: "USER",
    }),
    /name/i,
    "must throw when name is empty"
  );
});

test("createLegacyUser: throws for whitespace-only name", async () => {
  const { repo } = makeRepo();
  await assert.rejects(
    () => repo.createLegacyUser({
      name: "   ",
      email: "x@example.com",
      phone: "+994500",
      passwordHash: "$2b$10$hash",
      role: "USER",
    }),
    /name/i,
    "must throw when name is whitespace-only"
  );
});

test("createLegacyUser: sets UserStatus ACTIVE on created user", async () => {
  const created = makePgUser({ id: "clxnew01", role: "CARGO_OWNER", status: "ACTIVE" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Leyla Aliyeva",
    email: "leyla@example.com",
    phone: "+99450000001",
    passwordHash: "$2b$10$hash",
    role: "USER",
  });
  const createCall = calls.find(c => c.method === "user.create");
  assert.equal(createCall.args.data.status, "ACTIVE");
});

test("createLegacyUser: stores passwordHash on User row", async () => {
  const created = makePgUser({ id: "clxnew01", role: "CARGO_OWNER" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Leyla Aliyeva",
    email: "leyla@example.com",
    phone: "+99450000001",
    passwordHash: "$2b$10$testhash",
    role: "USER",
  });
  const createCall = calls.find(c => c.method === "user.create");
  assert.equal(createCall.args.data.passwordHash, "$2b$10$testhash");
});

test("createLegacyUser: preserves email and phone on User row", async () => {
  const created = makePgUser({ id: "clxnew01", role: "CARGO_OWNER" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Leyla Aliyeva",
    email: "leyla@example.com",
    phone: "+99450000001",
    passwordHash: "$2b$10$hash",
    role: "USER",
  });
  const createCall = calls.find(c => c.method === "user.create");
  assert.equal(createCall.args.data.email, "leyla@example.com");
  assert.equal(createCall.args.data.phone, "+99450000001");
});

test("createLegacyUser: creates CargoOwnerProfile exactly for CARGO_OWNER (USER) role", async () => {
  const created = makePgUser({ id: "clxnew01", role: "CARGO_OWNER" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Leyla Aliyeva",
    email: "leyla@example.com",
    phone: "+99450000001",
    passwordHash: "$2b$10$hash",
    role: "USER",
  });
  const profileCreate = calls.find(c => c.method === "cargoOwnerProfile.create");
  assert.ok(profileCreate, "must call cargoOwnerProfile.create for USER/CARGO_OWNER role");
  assert.equal(profileCreate.args.data.userId, "clxnew01", "profile must link to created user id");
});

test("createLegacyUser: does NOT create CargoOwnerProfile for ADMIN role", async () => {
  const created = makePgUser({ id: "clxadmin2", role: "ADMIN" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Admin Person",
    email: "admin2@example.com",
    phone: "+99450000010",
    passwordHash: "$2b$10$hash",
    role: "ADMIN",
  });
  const profileCreate = calls.find(c => c.method === "cargoOwnerProfile.create");
  assert.ok(!profileCreate, "must NOT create CargoOwnerProfile for ADMIN role");
});

test("createLegacyUser: does NOT create CargoOwnerProfile for CARRIER role", async () => {
  const created = makePgUser({ id: "clxcar2", role: "CARRIER" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Carrier Person",
    email: "carrier2@example.com",
    phone: "+99450000011",
    passwordHash: "$2b$10$hash",
    role: "CARRIER",
  });
  const profileCreate = calls.find(c => c.method === "cargoOwnerProfile.create");
  assert.ok(!profileCreate, "must NOT create CargoOwnerProfile for CARRIER role");
});

test("createLegacyUser: returns legacy DTO with password field (not passwordHash)", async () => {
  const created = makePgUser({ id: "clxnew01", role: "CARGO_OWNER", passwordHash: "$2b$10$returnhash" });
  const { repo } = makeRepo({ userCreate: created });
  const dto = await repo.createLegacyUser({
    name: "Leyla Aliyeva",
    email: "leyla@example.com",
    phone: "+99450000001",
    passwordHash: "$2b$10$returnhash",
    role: "USER",
  });
  assert.ok("password" in dto, "returned DTO must have password field");
  assert.ok(!("passwordHash" in dto), "returned DTO must NOT have passwordHash field");
  assert.equal(dto.password, "$2b$10$returnhash");
});

test("createLegacyUser: returned DTO has correct role mapping (CARGO_OWNER -> USER)", async () => {
  const created = makePgUser({ id: "clxnew01", role: "CARGO_OWNER" });
  const { repo } = makeRepo({ userCreate: created });
  const dto = await repo.createLegacyUser({
    name: "Leyla Aliyeva",
    email: "leyla@example.com",
    phone: "+99450000001",
    passwordHash: "$2b$10$hash",
    role: "USER",
  });
  assert.equal(dto.role, "USER", "returned DTO must map CARGO_OWNER back to USER");
});

// ── findIdentityConflict: single-field variants (no malformed empty OR clause) ─

test("findIdentityConflict: email-only — OR clause has exactly the email term, no empty phone term", async () => {
  const { repo, calls } = makeRepo({ findFirst: null });
  await repo.findIdentityConflict({ email: "a@example.com" });
  const call = calls.find(c => c.method === "user.findFirst");
  assert.ok(call, "must call user.findFirst");
  const { where } = call.args;
  assert.ok(where && Array.isArray(where.OR), "where must have OR array");
  const emailClause = where.OR.find(c => "email" in c);
  assert.ok(emailClause, "OR must include email clause");
  assert.equal(emailClause.email, "a@example.com", "email clause must hold the value");
  // must not contain a phone clause whose value is undefined/null/empty
  const badPhone = where.OR.find(c => "phone" in c && !c.phone);
  assert.ok(!badPhone, "must not include a phone clause with falsy/undefined value");
});

test("findIdentityConflict: phone-only — OR clause has exactly the phone term, no empty email term", async () => {
  const { repo, calls } = makeRepo({ findFirst: null });
  await repo.findIdentityConflict({ phone: "+99450000099" });
  const call = calls.find(c => c.method === "user.findFirst");
  assert.ok(call, "must call user.findFirst");
  const { where } = call.args;
  assert.ok(where && Array.isArray(where.OR), "where must have OR array");
  const phoneClause = where.OR.find(c => "phone" in c);
  assert.ok(phoneClause, "OR must include phone clause");
  assert.equal(phoneClause.phone, "+99450000099", "phone clause must hold the value");
  // must not contain an email clause whose value is undefined/null/empty
  const badEmail = where.OR.find(c => "email" in c && !c.email);
  assert.ok(!badEmail, "must not include an email clause with falsy/undefined value");
});

test("findIdentityConflict: email-only — returns match without phone in query", async () => {
  const existing = makePgUser({ id: "clxonly", email: "only@example.com" });
  const { repo } = makeRepo({ findFirst: existing });
  const result = await repo.findIdentityConflict({ email: "only@example.com" });
  assert.ok(result !== null, "must return conflict row for email-only query");
});

test("findIdentityConflict: phone-only — returns match without email in query", async () => {
  const existing = makePgUser({ id: "clxphone", phone: "+99499999001" });
  const { repo } = makeRepo({ findFirst: existing });
  const result = await repo.findIdentityConflict({ phone: "+99499999001" });
  assert.ok(result !== null, "must return conflict row for phone-only query");
});

// ── createLegacyUser: vehicleType / capacity preserved ───────────────────────

test("createLegacyUser: preserves vehicleType into legacyVehicleType on user.create", async () => {
  const created = makePgUser({ id: "clxdriver2", role: "DRIVER" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Driver Two",
    email: "driver2@example.com",
    phone: "+99450001001",
    passwordHash: "$2b$10$hash",
    role: "DRIVER",
    vehicleType: "TRUCK",
  });
  const createCall = calls.find(c => c.method === "user.create");
  assert.ok(createCall, "must call user.create");
  assert.equal(
    createCall.args.data.legacyVehicleType,
    "TRUCK",
    "vehicleType must be stored as legacyVehicleType"
  );
});

test("createLegacyUser: preserves capacity into legacyCapacity on user.create", async () => {
  const created = makePgUser({ id: "clxdriver3", role: "DRIVER" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Driver Three",
    email: "driver3@example.com",
    phone: "+99450001002",
    passwordHash: "$2b$10$hash",
    role: "DRIVER",
    capacity: 15.5,
  });
  const createCall = calls.find(c => c.method === "user.create");
  assert.ok(createCall, "must call user.create");
  assert.equal(
    createCall.args.data.legacyCapacity,
    15.5,
    "capacity must be stored as legacyCapacity"
  );
});

test("createLegacyUser: legacyVehicleType is undefined when vehicleType not supplied", async () => {
  const created = makePgUser({ id: "clxnew01", role: "CARGO_OWNER" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Leyla Aliyeva",
    email: "leyla@example.com",
    phone: "+99450000001",
    passwordHash: "$2b$10$hash",
    role: "USER",
  });
  const createCall = calls.find(c => c.method === "user.create");
  assert.ok(createCall, "must call user.create");
  assert.strictEqual(
    createCall.args.data.legacyVehicleType,
    undefined,
    "legacyVehicleType must be absent when vehicleType not supplied"
  );
});

test("createLegacyUser: legacyCapacity is undefined when capacity not supplied", async () => {
  const created = makePgUser({ id: "clxnew01", role: "CARGO_OWNER" });
  const { repo, calls } = makeRepo({ userCreate: created });
  await repo.createLegacyUser({
    name: "Leyla Aliyeva",
    email: "leyla@example.com",
    phone: "+99450000001",
    passwordHash: "$2b$10$hash",
    role: "USER",
  });
  const createCall = calls.find(c => c.method === "user.create");
  assert.ok(createCall, "must call user.create");
  assert.strictEqual(
    createCall.args.data.legacyCapacity,
    undefined,
    "legacyCapacity must be absent when capacity not supplied"
  );
});

test("createLegacyUser: returned DTO has id, name, email, phone, role, created_at", async () => {
  const created = makePgUser({
    id: "clxnew01",
    firstName: "Leyla",
    lastName: "Aliyeva",
    email: "leyla@example.com",
    phone: "+99450000001",
    role: "CARGO_OWNER",
    createdAt: new Date("2026-07-21T00:00:00.000Z"),
  });
  const { repo } = makeRepo({ userCreate: created });
  const dto = await repo.createLegacyUser({
    name: "Leyla Aliyeva",
    email: "leyla@example.com",
    phone: "+99450000001",
    passwordHash: "$2b$10$hash",
    role: "USER",
  });
  assert.equal(dto.id, "clxnew01");
  assert.equal(dto.name, "Leyla Aliyeva");
  assert.equal(dto.email, "leyla@example.com");
  assert.equal(dto.phone, "+99450000001");
  assert.equal(dto.role, "USER");
  assert.deepEqual(dto.created_at, new Date("2026-07-21T00:00:00.000Z"));
});

// ── Fake Prisma builder with update/delete support ────────────────────────────

function makeFakePrismaFull(overrides = {}) {
  const calls = [];

  const user = {
    findFirst: async (args) => {
      calls.push({ method: "user.findFirst", args });
      return overrides.findFirst ?? null;
    },
    findUnique: async (args) => {
      calls.push({ method: "user.findUnique", args });
      return overrides.findUnique ?? null;
    },
    findMany: async (args) => {
      calls.push({ method: "user.findMany", args });
      return overrides.findMany ?? [];
    },
    create: async (args) => {
      calls.push({ method: "user.create", args });
      return overrides.userCreate ?? args.data ?? {};
    },
    update: async (args) => {
      calls.push({ method: "user.update", args });
      return overrides.userUpdate ?? args.data ?? {};
    },
    delete: async (args) => {
      calls.push({ method: "user.delete", args });
      return overrides.userDelete ?? { id: args.where?.id ?? "deleted" };
    },
  };

  const cargoOwnerProfile = {
    create: async (args) => {
      calls.push({ method: "cargoOwnerProfile.create", args });
      return overrides.profileCreate ?? args.data ?? {};
    },
  };

  const prisma = {
    user,
    cargoOwnerProfile,
    $transaction: async (fn) => {
      calls.push({ method: "$transaction" });
      return fn(prisma);
    },
  };

  return { prisma, calls };
}

function makeFullRepo(overrides = {}) {
  const { prisma, calls } = makeFakePrismaFull(overrides);
  const key = require.resolve("./postgresUserRepository.js");
  delete require.cache[key];
  const { makeUserRepository } = require("./postgresUserRepository.js");
  return { repo: makeUserRepository(prisma), calls };
}

// ── updateProfile ─────────────────────────────────────────────────────────────

test("updateProfile: calls user.update with correct where and data", async () => {
  const updated = makePgUser({ id: "clxme", firstName: "Yeni", lastName: "Ad", email: "yeni@example.com", phone: "+994501111111" });
  const { repo, calls } = makeFullRepo({ userUpdate: updated });
  await repo.updateProfile({
    id: "clxme",
    name: "Yeni Ad",
    email: "yeni@example.com",
    phone: "+994501111111",
  });
  const call = calls.find(c => c.method === "user.update");
  assert.ok(call, "must call user.update");
  assert.equal(call.args.where?.id, "clxme", "where must target user id");
  assert.equal(call.args.data?.email, "yeni@example.com", "must update email");
  assert.equal(call.args.data?.phone, "+994501111111", "must update phone");
});

test("updateProfile: splits name into firstName and lastName on update", async () => {
  const updated = makePgUser({ id: "clxme", firstName: "Yeni", lastName: "Soyad" });
  const { repo, calls } = makeFullRepo({ userUpdate: updated });
  await repo.updateProfile({ id: "clxme", name: "Yeni Soyad", email: "x@x.com", phone: "+994500000001" });
  const call = calls.find(c => c.method === "user.update");
  assert.ok(call, "must call user.update");
  assert.equal(call.args.data?.firstName, "Yeni", "firstName must be first word");
  assert.equal(call.args.data?.lastName, "Soyad", "lastName must be remaining words");
});

test("updateProfile: single-word name sets firstName only, lastName empty string", async () => {
  const updated = makePgUser({ id: "clxme", firstName: "Yeni", lastName: "" });
  const { repo, calls } = makeFullRepo({ userUpdate: updated });
  await repo.updateProfile({ id: "clxme", name: "Yeni", email: "x@x.com", phone: "+994500000001" });
  const call = calls.find(c => c.method === "user.update");
  assert.ok(call, "must call user.update");
  assert.equal(call.args.data?.firstName, "Yeni");
  assert.equal(call.args.data?.lastName, "");
});

test("updateProfile: sets profileImage when provided", async () => {
  const updated = makePgUser({ id: "clxme", profileImage: "/uploads/new.webp" });
  const { repo, calls } = makeFullRepo({ userUpdate: updated });
  await repo.updateProfile({
    id: "clxme",
    name: "Ali Bey",
    email: "x@x.com",
    phone: "+994500000001",
    profileImage: "/uploads/new.webp",
  });
  const call = calls.find(c => c.method === "user.update");
  assert.ok(call, "must call user.update");
  assert.equal(call.args.data?.profileImage, "/uploads/new.webp", "must set profileImage");
});

test("updateProfile: omits profileImage from data when not provided", async () => {
  const updated = makePgUser({ id: "clxme" });
  const { repo, calls } = makeFullRepo({ userUpdate: updated });
  await repo.updateProfile({ id: "clxme", name: "Ali Bey", email: "x@x.com", phone: "+994500000001" });
  const call = calls.find(c => c.method === "user.update");
  assert.ok(call, "must call user.update");
  assert.ok(!("profileImage" in (call.args.data ?? {})), "must NOT set profileImage when not provided");
});

test("updateProfile: returns legacy DTO of the updated user", async () => {
  const updated = makePgUser({
    id: "clxme",
    firstName: "Yeni",
    lastName: "Ad",
    email: "yeni@example.com",
    phone: "+994501111111",
    role: "CARGO_OWNER",
    profileImage: "/uploads/p.webp",
  });
  const { repo } = makeFullRepo({ userUpdate: updated });
  const dto = await repo.updateProfile({
    id: "clxme",
    name: "Yeni Ad",
    email: "yeni@example.com",
    phone: "+994501111111",
  });
  assert.ok(dto, "must return a DTO");
  assert.equal(dto.id, "clxme");
  assert.equal(dto.name, "Yeni Ad");
  assert.equal(dto.email, "yeni@example.com");
  assert.equal(dto.role, "USER", "CARGO_OWNER must map to USER in DTO");
  assert.equal(dto.profile_picture, "/uploads/p.webp");
});

test("updateProfile: uses $transaction", async () => {
  const updated = makePgUser({ id: "clxme" });
  const { repo, calls } = makeFullRepo({ userUpdate: updated });
  await repo.updateProfile({ id: "clxme", name: "A B", email: "a@b.com", phone: "+994500000001" });
  assert.ok(calls.some(c => c.method === "$transaction"), "must use $transaction");
});

test("updateProfile: does not use SQLite (.prepare) syntax", () => {
  const fs = require("fs");
  const path = require("path");
  const src = fs.readFileSync(path.join(__dirname, "postgresUserRepository.js"), "utf8");
  assert.ok(!src.includes(".prepare("), "updateProfile must not use .prepare() (SQLite API)");
});

// ── deleteUserWithCargos ──────────────────────────────────────────────────────

test("deleteUserWithCargos: calls user.delete with correct id", async () => {
  const { repo, calls } = makeFullRepo({ userDelete: { id: "clxme" } });
  await repo.deleteUserWithCargos("clxme");
  const call = calls.find(c => c.method === "user.delete");
  assert.ok(call, "must call user.delete");
  assert.equal(call.args.where?.id, "clxme", "must delete by canonical user id");
});

test("deleteUserWithCargos: uses $transaction", async () => {
  const { repo, calls } = makeFullRepo({ userDelete: { id: "clxme" } });
  await repo.deleteUserWithCargos("clxme");
  assert.ok(calls.some(c => c.method === "$transaction"), "must use $transaction");
});

test("deleteUserWithCargos: does not call db.prepare (no SQLite)", () => {
  const fs = require("fs");
  const path = require("path");
  const src = fs.readFileSync(path.join(__dirname, "postgresUserRepository.js"), "utf8");
  assert.ok(!src.includes(".prepare("), "deleteUserWithCargos must not use .prepare()");
});

test("deleteUserWithCargos: resolves without throwing when user exists", async () => {
  const { repo } = makeFullRepo({ userDelete: { id: "clxme" } });
  await assert.doesNotReject(
    () => repo.deleteUserWithCargos("clxme"),
    "must resolve when user exists"
  );
});

// ── updateLegacyRole ──────────────────────────────────────────────────────────

test("updateLegacyRole: method exists on the repository", () => {
  const { repo } = makeFullRepo();
  assert.equal(typeof repo.updateLegacyRole, "function", "updateLegacyRole must be a function on the repository");
});

test("updateLegacyRole: throws for unsupported legacy role", async () => {
  const { repo } = makeFullRepo();
  await assert.rejects(
    () => repo.updateLegacyRole("clxme", "SUPERUSER"),
    /unsupported role/i,
    "must throw with 'unsupported role' for unknown legacy role"
  );
});

test("updateLegacyRole: throws for empty role string", async () => {
  const { repo } = makeFullRepo();
  await assert.rejects(
    () => repo.updateLegacyRole("clxme", ""),
    /unsupported role/i,
    "must throw for empty role string"
  );
});

test("updateLegacyRole: uses $transaction", async () => {
  const updated = makePgUser({ id: "clxme", role: "ADMIN" });
  const { repo, calls } = makeFullRepo({ userUpdate: updated });
  await repo.updateLegacyRole("clxme", "ADMIN");
  assert.ok(calls.some(c => c.method === "$transaction"), "must use $transaction");
});

test("updateLegacyRole: calls user.update with canonical id", async () => {
  const updated = makePgUser({ id: "clxme", role: "ADMIN" });
  const { repo, calls } = makeFullRepo({ userUpdate: updated });
  await repo.updateLegacyRole("clxme", "ADMIN");
  const call = calls.find(c => c.method === "user.update");
  assert.ok(call, "must call user.update");
  assert.equal(call.args.where?.id, "clxme", "must target user by canonical id");
});

test("updateLegacyRole: maps legacy USER to canonical CARGO_OWNER in update data", async () => {
  const updated = makePgUser({ id: "clxme", role: "CARGO_OWNER" });
  const { repo, calls } = makeFullRepo({ userUpdate: updated });
  await repo.updateLegacyRole("clxme", "USER");
  const call = calls.find(c => c.method === "user.update");
  assert.ok(call, "must call user.update");
  assert.equal(call.args.data?.role, "CARGO_OWNER", "USER must map to CARGO_OWNER");
});

test("updateLegacyRole: maps legacy ADMIN to canonical ADMIN unchanged", async () => {
  const updated = makePgUser({ id: "clxme", role: "ADMIN" });
  const { repo, calls } = makeFullRepo({ userUpdate: updated });
  await repo.updateLegacyRole("clxme", "ADMIN");
  const call = calls.find(c => c.method === "user.update");
  assert.equal(call.args.data?.role, "ADMIN");
});

test("updateLegacyRole: maps legacy CARRIER unchanged", async () => {
  const updated = makePgUser({ id: "clxme", role: "CARRIER" });
  const { repo, calls } = makeFullRepo({ userUpdate: updated });
  await repo.updateLegacyRole("clxme", "CARRIER");
  const call = calls.find(c => c.method === "user.update");
  assert.equal(call.args.data?.role, "CARRIER");
});

test("updateLegacyRole: maps legacy DRIVER unchanged", async () => {
  const updated = makePgUser({ id: "clxme", role: "DRIVER" });
  const { repo, calls } = makeFullRepo({ userUpdate: updated });
  await repo.updateLegacyRole("clxme", "DRIVER");
  const call = calls.find(c => c.method === "user.update");
  assert.equal(call.args.data?.role, "DRIVER");
});

test("updateLegacyRole: maps legacy DISPATCHER unchanged", async () => {
  const updated = makePgUser({ id: "clxme", role: "DISPATCHER" });
  const { repo, calls } = makeFullRepo({ userUpdate: updated });
  await repo.updateLegacyRole("clxme", "DISPATCHER");
  const call = calls.find(c => c.method === "user.update");
  assert.equal(call.args.data?.role, "DISPATCHER");
});

test("updateLegacyRole: fails closed (throws) when user.update throws (user not found)", async () => {
  const { prisma, calls } = makeFakePrismaFull();
  prisma.user.update = async () => { throw new Error("Record not found"); };
  const key = require.resolve("./postgresUserRepository.js");
  delete require.cache[key];
  const { makeUserRepository } = require("./postgresUserRepository.js");
  const repo = makeUserRepository(prisma);
  await assert.rejects(
    () => repo.updateLegacyRole("nonexistent", "ADMIN"),
    /not found/i,
    "must propagate error when user does not exist"
  );
});

test("updateLegacyRole: returns legacy DTO with new role on success", async () => {
  const updated = makePgUser({ id: "clxme", role: "ADMIN" });
  const { repo } = makeFullRepo({ userUpdate: updated });
  const dto = await repo.updateLegacyRole("clxme", "ADMIN");
  assert.ok(dto, "must return a DTO");
  assert.equal(dto.id, "clxme");
  assert.equal(dto.role, "ADMIN", "returned DTO must have the new role");
});
