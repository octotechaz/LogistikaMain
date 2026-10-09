import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SUPPORTED_LOCALES = ["az", "ru", "en", "tr"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

// All SEO keys (locale-independent – stored as seo_<key>)
const SEO_KEYS = [
  // Global / default
  "seo_site_name",
  "seo_default_title",
  "seo_title_template",
  "seo_default_description",
  "seo_default_keywords",
  "seo_site_url",
  "seo_og_image",
  "seo_og_type",
  "seo_twitter_card",
  "seo_twitter_site",
  "seo_robots_default",
  // Per-page overrides stored as seo_page_<pageId>_<field>_<locale>
] as const;

// Page-level SEO keys (per locale)
export const SEO_PAGES = [
  { id: "home",       label: "Ana Səhifə",        path: "/" },
  { id: "about",      label: "Haqqımızda",         path: "/haqqimizda" },
  { id: "contact",    label: "Əlaqə",              path: "/elaqe" },
  { id: "howitworks", label: "Necə işləyir",       path: "/how-it-works" },
  { id: "login",      label: "Giriş",              path: "/login" },
  { id: "register",   label: "Qeydiyyat",          path: "/register" },
  { id: "loads",      label: "Elanlar siyahısı",   path: "/loads" },
  { id: "privacy",    label: "Məxfilik siyasəti",  path: "/mexfilik-siyaseti" },
  { id: "terms",      label: "İstifadə şərtləri",  path: "/istifade-sertleri" },
  { id: "rules",      label: "Qaydalar",           path: "/qaydalar" },
] as const;

const PAGE_FIELDS = ["title", "description", "keywords", "og_title", "og_description", "og_image", "robots", "canonical"] as const;

export async function GET(request: NextRequest) {
  const locale = (request.nextUrl.searchParams.get("locale") ?? "az") as Locale;
  const safeLocale: Locale = SUPPORTED_LOCALES.includes(locale) ? locale : "az";

  // Load global settings (locale-independent)
  const globalRows = await prisma.appSetting.findMany({
    where: { key: { in: SEO_KEYS as unknown as string[] } },
  });
  const global: Record<string, string> = {};
  for (const row of globalRows) global[row.key] = row.value;

  // Load per-page settings for the requested locale
  const pageKeys = SEO_PAGES.flatMap((page) =>
    PAGE_FIELDS.map((field) => `seo_page_${page.id}_${field}_${safeLocale}`)
  );
  const pageRows = await prisma.appSetting.findMany({
    where: { key: { in: pageKeys } },
  });
  const pages: Record<string, Record<string, string>> = {};
  for (const page of SEO_PAGES) {
    pages[page.id] = {};
    for (const field of PAGE_FIELDS) {
      const dbKey = `seo_page_${page.id}_${field}_${safeLocale}`;
      const row = pageRows.find((r) => r.key === dbKey);
      if (row) pages[page.id][field] = row.value;
    }
  }

  return NextResponse.json({ ok: true, locale: safeLocale, global, pages });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      locale: string;
      global?: Record<string, string>;
      pages?: Record<string, Record<string, string>>;
    };
    const safeLocale: Locale = SUPPORTED_LOCALES.includes(body.locale as Locale)
      ? (body.locale as Locale)
      : "az";

    const upserts: Promise<unknown>[] = [];

    // Save global settings
    if (body.global) {
      for (const [key, value] of Object.entries(body.global)) {
        if (SEO_KEYS.includes(key as typeof SEO_KEYS[number])) {
          upserts.push(
            prisma.appSetting.upsert({
              where: { key },
              update: { value },
              create: { key, value },
            })
          );
        }
      }
    }

    // Save per-page settings
    if (body.pages) {
      for (const [pageId, fields] of Object.entries(body.pages)) {
        const pageExists = SEO_PAGES.some((p) => p.id === pageId);
        if (!pageExists) continue;
        for (const [field, value] of Object.entries(fields)) {
          if (!PAGE_FIELDS.includes(field as typeof PAGE_FIELDS[number])) continue;
          const dbKey = `seo_page_${pageId}_${field}_${safeLocale}`;
          upserts.push(
            prisma.appSetting.upsert({
              where: { key: dbKey },
              update: { value },
              create: { key: dbKey, value },
            })
          );
        }
      }
    }

    await Promise.all(upserts);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Saxlama xətası" }, { status: 500 });
  }
}