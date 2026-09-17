import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function loadCategories() {
  const filePath = path.join(process.cwd(), "public", "data", "categories.json");
  try {
    const raw = readFileSync(filePath, "utf8");
    const all = JSON.parse(raw);
    return Array.isArray(all) ? all.filter((c) => c.isActive !== false) : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const categories = loadCategories();
  return NextResponse.json({ data: categories }, { headers: CORS_HEADERS });
}