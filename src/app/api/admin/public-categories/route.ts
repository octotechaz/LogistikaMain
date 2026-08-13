import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/api";
import {
  deletePublicSqliteCategory,
  getPublicSqliteCategories,
  upsertPublicSqliteCategory,
} from "@/lib/public-listings-sqlite";
import { makePublicCategoryHandlers } from "./handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { GET, POST, DELETE } = makePublicCategoryHandlers({
  requireAuth: (req: NextRequest) => requireApiUser(req, ["ADMIN"]),
  getCategories: () => getPublicSqliteCategories({ includeInactive: true }),
  upsertCategory: upsertPublicSqliteCategory,
  deleteCategory: deletePublicSqliteCategory,
});

export { GET, POST, DELETE };