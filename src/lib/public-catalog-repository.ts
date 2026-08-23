import {
  deletePublicSqliteCategory,
  getPublicSqliteCategories,
  upsertPublicSqliteCategory
} from "@/lib/public-listings-sqlite";

export type PublicCatalogCategory = {
  id: string;
  legacySqliteId: string;
  label: string;
  labelTranslations?: Record<string, string>;
  iconKey: string;
  iconTone: string;
  matchCargoType: string | null;
  matchVehicleType: string | null;
  matchKeyword: string | null;
  sortOrder: number;
  isActive: boolean;
};

function mapCategory(row: {
  id: string;
  label: string;
  labelTranslations?: Record<string, string>;
  iconKey: string;
  iconTone: string;
  matchCargoType?: string;
  matchVehicleType?: string;
  matchKeyword?: string;
  sortOrder: number;
  isActive: boolean;
}): PublicCatalogCategory {
  return {
    id: row.id,
    legacySqliteId: row.id,
    label: row.label,
    labelTranslations: row.labelTranslations,
    iconKey: row.iconKey,
    iconTone: row.iconTone,
    matchCargoType: row.matchCargoType ?? null,
    matchVehicleType: row.matchVehicleType ?? null,
    matchKeyword: row.matchKeyword ?? null,
    sortOrder: row.sortOrder,
    isActive: row.isActive
  };
}

export async function listPublicCategories(opts: { includeInactive?: boolean } = {}) {
  return getPublicSqliteCategories({ includeInactive: Boolean(opts.includeInactive) }).map(mapCategory);
}

export async function upsertPublicCategory(input: {
  id: string;
  label: string;
  labelTranslations?: Record<string, string>;
  iconKey: string;
  iconTone: string;
  matchCargoType: string | null;
  matchVehicleType: string | null;
  matchKeyword: string | null;
  sortOrder: number;
  isActive: boolean;
}) {
  upsertPublicSqliteCategory({
    id: input.id,
    label: input.label,
    labelTranslations: input.labelTranslations,
    iconKey: input.iconKey,
    iconTone: input.iconTone,
    matchCargoType: input.matchCargoType ?? undefined,
    matchVehicleType: input.matchVehicleType ?? undefined,
    matchKeyword: input.matchKeyword ?? undefined,
    sortOrder: input.sortOrder,
    isActive: input.isActive
  });

  return mapCategory({
    id: input.id,
    label: input.label,
    labelTranslations: input.labelTranslations,
    iconKey: input.iconKey,
    iconTone: input.iconTone,
    matchCargoType: input.matchCargoType ?? undefined,
    matchVehicleType: input.matchVehicleType ?? undefined,
    matchKeyword: input.matchKeyword ?? undefined,
    sortOrder: input.sortOrder,
    isActive: input.isActive
  });
}

export async function deletePublicCategory(id: string) {
  deletePublicSqliteCategory(id);
}
