import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/api";
import {
  deletePublicSqliteCategory,
  getPublicSqliteCategories,
  upsertPublicSqliteCategory,
} from "@/lib/public-listings-sqlite";
import { syncCategoryToLocales } from "@/lib/sync-category-locales";
import { makePublicCategoryHandlers } from "./handlers";
import type { PublicListingCategory } from "@/types/classifieds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function upsertAndSync(category: PublicListingCategory) {
  upsertPublicSqliteCategory(category);
  try {
    syncCategoryToLocales(category);
  } catch (err) {
    console.error("syncCategoryToLocales failed:", err);
  }
}

const { GET, POST, DELETE } = makePublicCategoryHandlers({
  requireAuth: (req: NextRequest) => requireApiUser(req, ["ADMIN"]),
  getCategories: () => getPublicSqliteCategories({ includeInactive: true }),
  upsertCategory: upsertAndSync,
  deleteCategory: deletePublicSqliteCategory,
});

export { GET, POST, DELETE };