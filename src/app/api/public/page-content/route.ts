import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const SUPPORTED_LOCALES = ["az", "ru", "en", "tr"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

const CONTENT_KEYS = [
  "home_hero_title",
  "home_hero_subtitle",
  "about_hero_title",
  "about_hero_description",
  "about_paragraphs",
  "about_advantages",
  "howitworks_title",
  "howitworks_description",
  "howitworks_steps",
];

async function loadLocaleFile(locale: Locale): Promise<Record<string, unknown>> {
  try {
    const filePath = path.join(process.cwd(), "public", "locales", `${locale}.json`);
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function normalizeValue(key: string, raw: string): unknown {
  if (["about_paragraphs", "about_advantages", "howitworks_steps"].includes(key)) {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const localeParam = request.nextUrl.searchParams.get("locale") ?? "az";
  const locale: Locale = SUPPORTED_LOCALES.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : "az";

  try {
    const localeDefaults = await loadLocaleFile(locale);

    const dbKeys = CONTENT_KEYS.map((k) => `${k}_${locale}`);
    const rows = await prisma.appSetting.findMany({
      where: { key: { in: dbKeys } },
    });
    const dbMap: Record<string, string> = {};
    for (const row of rows) {
      dbMap[row.key] = row.value;
    }

    const result: Record<string, unknown> = {};
    for (const key of CONTENT_KEYS) {
      const dbKey = `${key}_${locale}`;
      if (dbMap[dbKey] !== undefined) {
        result[key] = normalizeValue(key, dbMap[dbKey]);
      } else if (localeDefaults[key] !== undefined) {
        result[key] = localeDefaults[key];
      }
    }

    return NextResponse.json({ locale, ...result });
  } catch {
    const localeDefaults = await loadLocaleFile(locale).catch(() => ({}));
    return NextResponse.json({ locale, ...localeDefaults });
  }
}