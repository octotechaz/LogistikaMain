import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function formatSqliteCategories(categories: unknown[]) {
  return (categories as Record<string, unknown>[]).map((cat) => ({
    id: cat.id,
    label: cat.label,
    iconKey: cat.icon_key,
    iconTone: cat.icon_tone,
    matchCargoType: cat.match_cargo_type ?? null,
    matchVehicleType: cat.match_vehicle_type ?? null,
    matchKeyword: cat.match_keyword ?? null,
    sortOrder: cat.sort_order,
    isActive: cat.is_active === 1,
  }));
}

async function loadFromPrisma() {
  const rows = await prisma.publicCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  return rows.map((row) => ({
    id: row.legacySqliteId || row.id,
    label: row.label,
    iconKey: row.iconKey,
    iconTone: row.iconTone,
    matchCargoType: row.matchCargoType ?? null,
    matchVehicleType: row.matchVehicleType ?? null,
    matchKeyword: row.matchKeyword ?? null,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  }));
}

export async function GET() {
  // 1. SQLite-dan oxu (primary)
  try {
    const dbPath =
      process.env.PUBLIC_LISTINGS_SQLITE_PATH ||
      path.join(process.cwd(), "data", "public-listings.sqlite");
    const fs = await import("node:fs");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new Database(dbPath, { fileMustExist: false });

    const tableExists = db
      .prepare("SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'public_categories' LIMIT 1")
      .get() as { ok: number } | undefined;

    if (tableExists) {
      const categories = db
        .prepare("SELECT * FROM public_categories WHERE is_active = 1 ORDER BY sort_order ASC, label ASC")
        .all();
      db.close();

      if (categories.length > 0) {
        return NextResponse.json({ data: formatSqliteCategories(categories) }, { headers: CORS_HEADERS });
      }
    } else {
      db.close();
    }
  } catch {
    // SQLite uğursuz oldu, Prisma-ya keç
  }

  // 2. Prisma-dan oxu (fallback)
  try {
    const categories = await loadFromPrisma();
    if (categories.length > 0) {
      return NextResponse.json({ data: categories }, { headers: CORS_HEADERS });
    }
  } catch {
    // Prisma da uğursuz oldu
  }

  // 3. Heç bir mənbə yoxdursa boş array qaytar (hardcoded kateqoriya yox)
  return NextResponse.json({ data: [] }, { headers: CORS_HEADERS });
}