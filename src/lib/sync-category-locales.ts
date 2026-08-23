import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { PublicListingCategory } from "@/types/classifieds";

const LOCALES_DIR = path.join(process.cwd(), "public", "locales");
const SUPPORTED_LOCALES = ["az", "ru", "en", "tr"] as const;

function loadLocale(locale: string): Record<string, unknown> {
  try {
    const raw = readFileSync(path.join(LOCALES_DIR, `${locale}.json`), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveLocale(locale: string, data: Record<string, unknown>) {
  writeFileSync(
    path.join(LOCALES_DIR, `${locale}.json`),
    JSON.stringify(data, null, 2) + "\n",
    "utf8"
  );
}

export function syncCategoryToLocales(category: PublicListingCategory) {
  const chipKey = `catalog_chip_${category.id}`;

  for (const locale of SUPPORTED_LOCALES) {
    const data = loadLocale(locale);

    if (locale === "az") {
      data[chipKey] = category.label;
    } else {
      const translation = category.labelTranslations?.[locale];
      if (translation) {
        data[chipKey] = translation;
      } else if (!(chipKey in data)) {
        data[chipKey] = category.label;
      }
    }

    saveLocale(locale, data);
  }
}