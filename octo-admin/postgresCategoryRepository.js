"use strict";

/**
 * PostgreSQL-backed category repository for octo-admin.
 * Replaces direct SQLite queries on public_categories.
 *
 * All public methods return Promises. DTOs use legacy snake_case field names
 * so EJS views and form handlers require no changes.
 */

function makeCategoryRepository(prisma) {
  /** Map a Prisma PublicCategory row to the legacy snake_case DTO. */
  function toDto(row) {
    return {
      id:               row.legacySqliteId,
      label:            row.label,
      icon_key:         row.iconKey,
      icon_tone:        row.iconTone,
      match_cargo_type: row.matchCargoType,
      match_vehicle_type: row.matchVehicleType,
      match_keyword:    row.matchKeyword,
      sort_order:       row.sortOrder,
      is_active:        row.isActive ? 1 : 0,
    };
  }

  /** Generate a legacy-style id matching the original: cat_<base36time><random5>. */
  function generateLegacyId() {
    return "cat_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  return {
    /** Returns all categories ordered by sortOrder ASC, label ASC as snake_case DTOs. */
    async listOrdered() {
      const rows = await prisma.publicCategory.findMany({
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      });
      return rows.map(toDto);
    },

    /**
     * Upsert a category. When dto.id is a non-empty string, updates the
     * existing record identified by legacySqliteId. Otherwise inserts a new one.
     */
    async upsert(dto) {
      const legacyId = dto.id && dto.id.trim() !== "" ? dto.id.trim() : generateLegacyId();
      const iconKey   = dto.icon_key  || "boxes";
      const iconTone  = dto.icon_tone || "text-slate-500";
      const sortOrder = parseInt(dto.sort_order) || 0;
      const isActive  = dto.is_active === "1";

      const data = {
        label:     dto.label,
        iconKey,
        iconTone,
        sortOrder,
        isActive,
      };

      await prisma.publicCategory.upsert({
        where:  { legacySqliteId: legacyId },
        update: data,
        create: { ...data, legacySqliteId: legacyId },
      });
    },

    /** Delete a category by its legacy SQLite id. No-op when id is falsy. */
    async deleteById(id) {
      if (!id) return;
      await prisma.publicCategory.delete({
        where: { legacySqliteId: id },
      });
    },
  };
}

module.exports = { makeCategoryRepository };