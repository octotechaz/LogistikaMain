import { NextRequest } from "next/server";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { requireApiUser } from "@/lib/api";
import type { PublicListingCategory } from "@/types/classifieds";
import { makePublicCategoryHandlers } from "./handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES_FILE = path.join(process.cwd(), "public", "data", "categories.json");

function loadCategories(): PublicListingCategory[] {
  try {
    const raw = readFileSync(CATEGORIES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCategories(categories: PublicListingCategory[]) {
  writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2) + "\n", "utf8");
}

function upsertCategory(category: PublicListingCategory) {
  const categories = loadCategories();
  const idx = categories.findIndex((c) => c.id === category.id);
  if (idx >= 0) {
    categories[idx] = category;
  } else {
    categories.push(category);
  }
  categories.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  saveCategories(categories);
}

function deleteCategory(id: string) {
  const categories = loadCategories().filter((c) => c.id !== id);
  saveCategories(categories);
}

const { GET, POST, DELETE } = makePublicCategoryHandlers({
  requireAuth: (req: NextRequest) => requireApiUser(req, ["ADMIN"]),
  getCategories: loadCategories,
  upsertCategory,
  deleteCategory,
});

export { GET, POST, DELETE };