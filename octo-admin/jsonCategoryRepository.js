"use strict";

const fs = require("fs");
const path = require("path");

const CATEGORIES_JSON = path.join(process.cwd(), "public", "data", "categories.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(CATEGORIES_JSON, "utf8"));
  } catch {
    return [];
  }
}

function save(categories) {
  fs.writeFileSync(CATEGORIES_JSON, JSON.stringify(categories, null, 2) + "\n", "utf8");
}

function generateId() {
  return "cat_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function toDto(entry) {
  return {
    id:                entry.id,
    label:             entry.label,
    label_translations: entry.labelTranslations || {},
    icon_key:          entry.iconKey || "boxes",
    icon_tone:         entry.iconTone || "text-slate-500",
    match_cargo_type:  entry.matchCargoType || null,
    match_vehicle_type: entry.matchVehicleType || null,
    match_keyword:     entry.matchKeyword || null,
    sort_order:        entry.sortOrder ?? 0,
    is_active:         entry.isActive !== false ? 1 : 0,
  };
}

function makeJsonCategoryRepository() {
  return {
    async listOrdered() {
      const all = load();
      return all.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(toDto);
    },

    async upsert(dto) {
      const id = dto.id && String(dto.id).trim() !== "" ? String(dto.id).trim() : generateId();
      const labelTranslations = {};
      for (const loc of ["ru", "en", "tr"]) {
        const val = dto[`label_${loc}`] ? String(dto[`label_${loc}`]).trim() : null;
        if (val) labelTranslations[loc] = val;
      }

      const categories = load();
      const idx = categories.findIndex((c) => c.id === id);
      const isActive = dto.is_active === "1" || dto.is_active === 1 || dto.is_active === true;

      const existing = idx >= 0 ? categories[idx] : {};
      const entry = {
        id,
        label: String(dto.label || "").trim(),
        labelTranslations: Object.keys(labelTranslations).length > 0
          ? { ...(existing.labelTranslations || {}), ...labelTranslations }
          : (existing.labelTranslations || {}),
        iconKey:          dto.icon_key  || existing.iconKey  || "boxes",
        iconTone:         dto.icon_tone || existing.iconTone || "text-slate-500",
        matchCargoType:   dto.match_cargo_type   ? String(dto.match_cargo_type).trim()   : null,
        matchVehicleType: dto.match_vehicle_type ? String(dto.match_vehicle_type).trim() : null,
        matchKeyword:     dto.match_keyword       ? String(dto.match_keyword).trim()      : null,
        sortOrder:        parseInt(dto.sort_order, 10) || 0,
        isActive,
      };

      if (idx >= 0) {
        categories[idx] = entry;
      } else {
        categories.push(entry);
      }
      categories.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      save(categories);
    },

    async deleteById(id) {
      if (!id) return;
      const categories = load().filter((c) => c.id !== String(id));
      save(categories);
    },
  };
}

module.exports = { makeJsonCategoryRepository };