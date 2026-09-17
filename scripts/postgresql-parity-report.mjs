import { createHash } from "node:crypto";
import path from "node:path";
import { createRequire } from "node:module";

export class ParityInputError extends Error {}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function hash(value) {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function idOf(row, source) {
  return String(source === "sqlite" ? row.id : row.legacySqliteId);
}

function nullable(value) {
  return value ?? null;
}

function numberOrNull(value) {
  return value == null ? null : Number(value);
}

function decimalOrNull(value) {
  return value == null ? null : String(value);
}

function dateOrNull(value) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "__invalid_date__" : date.toISOString();
}

function bool(value) {
  return value === true || value === 1;
}

function userDto(row, source, legacyCargoOwnerIds) {
  if (source === "sqlite") {
    const name = String(row.name || "").trim().split(/\s+/).filter(Boolean);
    const role = row.role === "USER" && legacyCargoOwnerIds.has(row.id) ? "CARGO_OWNER" : row.role;
    return {
      id: idOf(row, source), firstName: name[0] || null, lastName: name.slice(1).join(" ") || null,
      email: nullable(row.email), phone: nullable(row.phone), role: nullable(role),
      legacyVehicleType: nullable(row.vehicle_type), legacyCapacity: numberOrNull(row.capacity), status: "ACTIVE",
    };
  }
  return {
    id: idOf(row, source), firstName: nullable(row.firstName), lastName: nullable(row.lastName),
    email: nullable(row.email), phone: nullable(row.phone), role: nullable(row.role),
    legacyVehicleType: nullable(row.legacyVehicleType), legacyCapacity: numberOrNull(row.legacyCapacity), status: nullable(row.status) || "ACTIVE",
  };
}

function cargoDto(row, source) {
  if (source === "sqlite") {
    return {
      id: idOf(row, source), cargoName: nullable(row.title), cargoType: nullable(row.cargo_type), description: nullable(row.description),
      weight: numberOrNull(row.weight), volume: numberOrNull(row.volume), length: numberOrNull(row.length), width: numberOrNull(row.width), height: numberOrNull(row.height),
      quantity: row.quantity == null ? null : String(row.quantity), pickupAddress: nullable(row.loading_address), deliveryAddress: nullable(row.unloading_address),
      pickupCity: nullable(row.loading_city ?? row.pickup_city), deliveryCity: nullable(row.unloading_city ?? row.delivery_city),
      pickupDate: dateOrNull(row.loading_date), pickupDeadlineDate: dateOrNull(row.latest_pickup_date), requiredVehicleType: nullable(row.transport_type),
      proposedPrice: decimalOrNull(row.price), contactPhone: nullable(row.phone), legacyPickupTime: nullable(row.loading_time), legacyNote: nullable(row.notes),
      legacyViewCount: numberOrNull(row.views) ?? 0, legacyAdminStatus: nullable(row.status) || "APPROVED", status: "ACTIVE",
    };
  }
  return {
    id: idOf(row, source), cargoName: nullable(row.cargoName), cargoType: nullable(row.cargoType), description: nullable(row.description),
    weight: numberOrNull(row.weight), volume: numberOrNull(row.volume), length: numberOrNull(row.length), width: numberOrNull(row.width), height: numberOrNull(row.height),
    quantity: row.quantity == null ? null : String(row.quantity), pickupAddress: nullable(row.pickupAddress), deliveryAddress: nullable(row.deliveryAddress),
    pickupCity: nullable(row.pickupCity), deliveryCity: nullable(row.deliveryCity), pickupDate: dateOrNull(row.pickupDate), pickupDeadlineDate: dateOrNull(row.pickupDeadlineDate),
    requiredVehicleType: nullable(row.requiredVehicleType), proposedPrice: decimalOrNull(row.proposedPrice), contactPhone: nullable(row.contactPhone),
    legacyPickupTime: nullable(row.legacyPickupTime), legacyNote: nullable(row.legacyNote), legacyViewCount: numberOrNull(row.legacyViewCount) ?? 0,
    legacyAdminStatus: nullable(row.legacyAdminStatus) || "APPROVED", status: nullable(row.status) || "ACTIVE",
  };
}

function imageDto(row, source) {
  return source === "sqlite"
    ? { id: idOf(row, source), cargoLegacyId: String(row.cargo_id), url: nullable(row.image_path) }
    : { id: idOf(row, source), cargoLegacyId: String(row.cargoPost?.legacySqliteId ?? row.cargoLegacySqliteId), url: nullable(row.url) };
}

function categoryDto(row, source) {
  return source === "sqlite"
    ? {
      id: idOf(row, source), label: nullable(row.label), iconKey: nullable(row.icon_key), iconTone: nullable(row.icon_tone) || "text-slate-500",
      matchCargoType: nullable(row.match_cargo_type), matchVehicleType: nullable(row.match_vehicle_type), matchKeyword: nullable(row.match_keyword),
      sortOrder: numberOrNull(row.sort_order) ?? 0, isActive: bool(row.is_active ?? 1),
    }
    : {
      id: idOf(row, source), label: nullable(row.label), iconKey: nullable(row.iconKey), iconTone: nullable(row.iconTone) || "text-slate-500",
      matchCargoType: nullable(row.matchCargoType), matchVehicleType: nullable(row.matchVehicleType), matchKeyword: nullable(row.matchKeyword),
      sortOrder: numberOrNull(row.sortOrder) ?? 0, isActive: bool(row.isActive),
    };
}

function mediaByCargo(rows, source) {
  const result = new Map();
  for (const row of rows) {
    const dto = imageDto(row, source);
    const urls = result.get(dto.cargoLegacyId) || [];
    if (dto.url) urls.push(dto.url);
    result.set(dto.cargoLegacyId, urls);
  }
  return new Map([...result].map(([id, urls]) => [id, [...new Set(urls)].sort()]));
}

function fallbackCargoMedia(row, source) {
  if (source === "sqlite") return [...new Set(String(row.image_urls || row.image_url || "").split(",").map((url) => url.trim()).filter(Boolean))].sort();
  return [...new Set((row.images || []).map((image) => image.url).filter(Boolean))].sort();
}

function compareFamily(sqliteRows, postgresRows, dtoFor) {
  const sqliteById = new Map(sqliteRows.map((row) => [idOf(row, "sqlite"), row]));
  const postgresById = new Map(postgresRows.map((row) => [idOf(row, "postgres"), row]));
  const missing = [...sqliteById.keys()].filter((id) => !postgresById.has(id)).sort();
  const unexpected = [...postgresById.keys()].filter((id) => !sqliteById.has(id)).sort();
  const dto = [];

  for (const id of sqliteById.keys()) {
    if (postgresById.has(id) && hash(dtoFor(sqliteById.get(id), "sqlite")) !== hash(dtoFor(postgresById.get(id), "postgres"))) dto.push(id);
  }
  return { missing, unexpected, dto };
}

function combinedIds(result) {
  return [...result.missing, ...result.unexpected];
}

/**
 * Builds a read-only, PII-safe parity result. Raw DTO values, URLs, and
 * identity fields are never returned: only counts and legacy record IDs are emitted.
 */
export function buildParityReport({ sqlite, postgres }) {
  const sqliteCargos = sqlite.cargos || [];
  const postgresCargos = postgres.cargos || [];
  const legacyCargoOwnerIds = new Set(sqliteCargos.map((row) => row.user_id));
  const users = compareFamily(sqlite.users || [], postgres.users || [], (row, source) => userDto(row, source, legacyCargoOwnerIds));
  const cargos = compareFamily(sqliteCargos, postgresCargos, cargoDto);
  const images = compareFamily(sqlite.images || [], postgres.images || [], imageDto);
  const categories = compareFamily(sqlite.categories || [], postgres.categories || [], categoryDto);
  const sqliteMedia = mediaByCargo(sqlite.images || [], "sqlite");
  const postgresMedia = mediaByCargo(postgres.images || [], "postgres");
  const cargoMedia = [];

  for (const id of new Set([
    ...sqliteCargos.map((row) => idOf(row, "sqlite")),
    ...postgresCargos.map((row) => idOf(row, "postgres")),
    ...sqliteMedia.keys(),
    ...postgresMedia.keys(),
  ])) {
    const sourceUrls = sqliteMedia.get(id) || fallbackCargoMedia(sqliteCargos.find((row) => idOf(row, "sqlite") === id) || {}, "sqlite");
    const targetUrls = postgresMedia.get(id) || fallbackCargoMedia(postgresCargos.find((row) => idOf(row, "postgres") === id) || {}, "postgres");
    if (JSON.stringify(sourceUrls) !== JSON.stringify(targetUrls)) cargoMedia.push(id);
  }

  const mismatches = {
    legacyIds: { users: combinedIds(users), cargos: combinedIds(cargos), images: combinedIds(images), categories: combinedIds(categories) },
    dtoHashes: { users: users.dto, cargos: cargos.dto, images: images.dto, categories: categories.dto },
    media: { cargos: cargoMedia.sort() },
  };
  return {
    generatedAt: new Date().toISOString(),
    counts: {
      users: { sqlite: (sqlite.users || []).length, postgres: (postgres.users || []).length },
      cargos: { sqlite: sqliteCargos.length, postgres: postgresCargos.length },
      images: { sqlite: (sqlite.images || []).length, postgres: (postgres.images || []).length },
      categories: { sqlite: (sqlite.categories || []).length, postgres: (postgres.categories || []).length },
    },
    mismatches,
    ok: Object.values(mismatches.legacyIds).every((items) => items.length === 0)
      && Object.values(mismatches.dtoHashes).every((items) => items.length === 0)
      && mismatches.media.cargos.length === 0,
  };
}

function sourceFailure(message) {
  return new ParityInputError(`Parity report failed: ${message}`);
}

/** Reads both legacy snapshots read-only and PostgreSQL with Prisma; never writes either store. */
export async function collectLiveParityInputs({ cargoDbPath, publicDbPath, PrismaClientCtor, DatabaseCtor }) {
  const require = createRequire(import.meta.url);
  const Database = DatabaseCtor || require("better-sqlite3");
  let cargoSqlite;
  let publicSqlite;
  let prisma;
  try {
    try {
      cargoSqlite = new Database(cargoDbPath, { readonly: true });
      const users = cargoSqlite.prepare("SELECT id, name, role, email, phone, vehicle_type, capacity FROM users").all();
      const cargos = cargoSqlite.prepare(`SELECT id, user_id, title, cargo_type, description, weight, quantity, volume, length, width, height, loading_city, loading_address, unloading_city, unloading_address, loading_date, latest_pickup_date, loading_time, transport_type, price, phone, notes, status, views FROM cargos`).all();
      const images = cargoSqlite.prepare("SELECT id, cargo_id, image_path FROM cargo_images").all();
      cargoSqlite.close();
      cargoSqlite = undefined;

      try {
        publicSqlite = new Database(publicDbPath, { readonly: true });
        const categories = publicSqlite.prepare("SELECT id, label, icon_key, icon_tone, match_cargo_type, match_vehicle_type, match_keyword, sort_order, is_active FROM public_categories").all();
        publicSqlite.close();
        publicSqlite = undefined;

        try {
          prisma = new PrismaClientCtor();
          const [postgresUsers, postgresCargos, postgresImages, postgresCategories] = await Promise.all([
            prisma.user.findMany({ where: { legacySqliteId: { not: null } }, select: { legacySqliteId: true, firstName: true, lastName: true, email: true, phone: true, role: true, legacyVehicleType: true, legacyCapacity: true, status: true } }),
            prisma.cargoPost.findMany({ where: { legacySqliteId: { not: null } }, select: { legacySqliteId: true, cargoName: true, cargoType: true, description: true, weight: true, volume: true, length: true, width: true, height: true, quantity: true, pickupAddress: true, deliveryAddress: true, pickupCity: true, deliveryCity: true, pickupDate: true, pickupDeadlineDate: true, requiredVehicleType: true, proposedPrice: true, contactPhone: true, legacyPickupTime: true, legacyNote: true, legacyViewCount: true, legacyAdminStatus: true, status: true } }),
            prisma.image.findMany({ where: { legacySqliteId: { not: null }, category: "CARGO" }, select: { legacySqliteId: true, url: true, cargoPost: { select: { legacySqliteId: true } } } }),
            prisma.publicCategory.findMany({ select: { legacySqliteId: true, label: true, iconKey: true, iconTone: true, matchCargoType: true, matchVehicleType: true, matchKeyword: true, sortOrder: true, isActive: true } }),
          ]);
          return { sqlite: { users, cargos, images, categories }, postgres: { users: postgresUsers, cargos: postgresCargos, images: postgresImages, categories: postgresCategories } };
        } catch {
          throw sourceFailure("PostgreSQL read unavailable. Verify the configured DATABASE_URL.");
        }
      } catch (error) {
        if (error instanceof ParityInputError) throw error;
        throw sourceFailure("SQLite public-category source unavailable. Verify the read-only public snapshot.");
      }
    } catch (error) {
      if (error instanceof ParityInputError) throw error;
      throw sourceFailure("SQLite cargo source unavailable. Verify the read-only cargo snapshot.");
    }
  } finally {
    cargoSqlite?.close();
    publicSqlite?.close();
    await prisma?.$disconnect();
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  if (!process.argv.includes("--live")) {
    process.stderr.write("Usage: node scripts/postgresql-parity-report.mjs --live\n");
    process.exitCode = 2;
  } else {
    try {
      const { PrismaClient } = await import("@prisma/client");
      const cargoDbPath = process.env.OCTO_ADMIN_SQLITE_PATH || path.join(process.cwd(), "octo-admin", "data", "cargo.db");
      const publicDbPath = process.env.PUBLIC_LISTINGS_SQLITE_PATH || path.join(process.cwd(), "data", "public-listings.sqlite");
      const inputs = await collectLiveParityInputs({ cargoDbPath, publicDbPath, PrismaClientCtor: PrismaClient });
      process.stdout.write(`${JSON.stringify(buildParityReport(inputs), null, 2)}\n`);
    } catch (error) {
      process.stderr.write(`${error instanceof ParityInputError ? error.message : "Parity report failed: unexpected parity input failure. Verify parity source contracts."}\n`);
      process.exitCode = 1;
    }
  }
}
