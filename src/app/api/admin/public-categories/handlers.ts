import { NextRequest, NextResponse } from "next/server";
import type { PublicListingCategory } from "@/types/classifieds";

export interface AuthResult {
  user: unknown;
  response: NextResponse | null;
}

export type RequireAuthFn = (request: NextRequest) => Promise<AuthResult>;

export interface HandlerDeps {
  requireAuth: RequireAuthFn;
  getCategories?: () => PublicListingCategory[];
  upsertCategory?: (c: PublicListingCategory) => void;
  deleteCategory?: (id: string) => void;
}

function fail(message: string): NextResponse {
  return NextResponse.json({ success: false, ok: false, error: { message } }, { status: 400 });
}

function normalizeCategory(input: Partial<PublicListingCategory>): PublicListingCategory {
  const id = String(input.id || "").trim();
  const label = String(input.label || "").trim();
  if (!id || !label) throw new Error("Kateqoriya ID və ad tələb olunur.");

  return {
    id,
    label,
    labelTranslations: input.labelTranslations && typeof input.labelTranslations === "object"
      ? input.labelTranslations
      : undefined,
    iconKey: String(input.iconKey || "boxes").trim(),
    iconTone: String(input.iconTone || "text-slate-500").trim(),
    matchCargoType: input.matchCargoType ? String(input.matchCargoType).trim() : undefined,
    matchVehicleType: input.matchVehicleType ? String(input.matchVehicleType).trim() : undefined,
    matchKeyword: input.matchKeyword ? String(input.matchKeyword).trim() : undefined,
    sortOrder: Number(input.sortOrder || 0),
    isActive: input.isActive !== false,
  };
}

export function makePublicCategoryHandlers(deps: HandlerDeps) {
  const { requireAuth } = deps;
  const getCategories = deps.getCategories ?? (() => []);
  const upsertCategory = deps.upsertCategory ?? (() => undefined);
  const deleteCategory = deps.deleteCategory ?? (() => undefined);

  async function GET(request: NextRequest) {
    const { response } = await requireAuth(request);
    if (response) return response;
    return NextResponse.json({ data: getCategories() });
  }

  async function POST(request: NextRequest) {
    const { response } = await requireAuth(request);
    if (response) return response;
    try {
      const category = normalizeCategory(await request.json());
      upsertCategory(category);
      return NextResponse.json({ data: category });
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Kateqoriya saxlanılmadı.");
    }
  }

  async function DELETE(request: NextRequest) {
    const { response } = await requireAuth(request);
    if (response) return response;
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return fail("Kateqoriya ID tələb olunur.");
    deleteCategory(id);
    return NextResponse.json({ ok: true });
  }

  return { GET, POST, DELETE };
}