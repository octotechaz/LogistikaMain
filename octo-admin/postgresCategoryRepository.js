"use strict";

/**
 * PostgreSQL-backed category repository for octo-admin.
 * Optionally dual-writes to public-site SQLite via categoryPublicSync.
 *
 * All public methods return Promises. DTOs use legacy snake_case field names
 * so EJS views and form handlers require no changes.
 */

function makeCategoryRepository(prisma, sync = null) {
  /** Map a Prisma PublicCategory row to the legacy snake_case DTO. */
  function toDto(row) {
    return {
      id:               row.legacySqliteId || row.id,
      label:            row.label,
      label_translations: row.labelTranslations || {},
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

  async function listRows() {
    return prisma.publicCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    });
  }

  return {
    /** Returns all categories ordered by sortOrder ASC, label ASC as snake_case DTOs. */
    async listOrdered() {
      let rows = await listRows();
      if (rows.length === 0 && sync && typeof sync.ensurePostgresSeeded === "function") {
        await sync.ensurePostgresSeeded(prisma);
        rows = await listRows();
      }
      return rows.map(toDto);
    },

    /**
     * Upsert a category. When dto.id is a non-empty string, updates the
     * existing record identified by legacySqliteId. Otherwise inserts a new one.
     */
    async upsert(dto) {
      const legacyId = dto.id && String(dto.id).trim() !== "" ? String(dto.id).trim() : generateLegacyId();
      const iconKey   = dto.icon_key  || "boxes";
      const iconTone  = dto.icon_tone || "text-slate-500";
      const sortOrder = parseInt(dto.sort_order, 10) || 0;
      const isActive  = dto.is_active === "1" || dto.is_active === 1 || dto.is_active === true;

      const labelTranslations = {};
      for (const loc of ["ru", "en", "tr"]) {
        const val = dto[`label_${loc}`] ? String(dto[`label_${loc}`]).trim() : null;
        if (val) labelTranslations[loc] = val;
      }

      const data = {
        label:           dto.label,
        labelTranslations: Object.keys(labelTranslations).length > 0 ? labelTranslations : undefined,
        iconKey,
        iconTone,
        sortOrder,
        isActive,
        matchCargoType:   dto.match_cargo_type   ? String(dto.match_cargo_type).trim()   : null,
        matchVehicleType: dto.match_vehicle_type ? String(dto.match_vehicle_type).trim() : null,
        matchKeyword:     dto.match_keyword       ? String(dto.match_keyword).trim()      : null,
      };

      await prisma.publicCategory.upsert({
        where:  { legacySqliteId: legacyId },
        update: data,
        create: { ...data, legacySqliteId: legacyId },
      });

      if (sync && typeof sync.upsertSqliteCategory === "function") {
        sync.upsertSqliteCategory({
          id: legacyId,
          label: dto.label,
          icon_key: iconKey,
          icon_tone: iconTone,
          match_cargo_type: dto.match_cargo_type || null,
          match_vehicle_type: dto.match_vehicle_type || null,
          match_keyword: dto.match_keyword || null,
          sort_order: sortOrder,
          is_active: isActive ? 1 : 0,
        });
      }
    },

    /** Delete a category by its legacy SQLite id. No-op when id is falsy. */
    async deleteById(id) {
      if (!id) return;
      const legacyId = String(id);
      await prisma.publicCategory.delete({
        where: { legacySqliteId: legacyId },
      });
      if (sync && typeof sync.deleteSqliteCategory === "function") {
        sync.deleteSqliteCategory(legacyId);
      }
    },
  };
}

module.exports = { makeCategoryRepository };
