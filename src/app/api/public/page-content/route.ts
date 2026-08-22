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
  "search_eyebrow",
  "search_title",
  "search_route_label",
  "search_pickup_city",
  "search_delivery_city",
  "search_cargo_type",
  "search_vehicle_type",
  "search_keyword",
  "search_keyword_placeholder",
  "search_btn",
  "search_btn_loading",
  "search_advanced_btn",
  "search_advanced_hint",
  "listings_title",
  "categories_title",
  "login_eyebrow","login_title","login_subtitle",
  "login_tab_owner","login_tab_carrier",
  "login_method_phone","login_method_email",
  "login_field_phone","login_field_email","login_field_email_placeholder",
  "login_field_password","login_field_password_placeholder",
  "login_forgot_password","login_btn","login_btn_loading",
  "login_btn_owner","login_btn_carrier",
  "login_no_account","login_register_owner","login_register_carrier",
  "login_sidebar_title","login_sidebar_owner_title","login_sidebar_carrier_title",
  "login_sidebar_owner_desc","login_sidebar_carrier_desc",
  "login_error_invalid","login_error_phone","login_error_email",
  "register_title","register_eyebrow_owner","register_eyebrow_carrier",
  "register_subtitle_owner","register_subtitle_carrier",
  "register_field_firstname","register_field_lastname","register_field_phone",
  "register_field_email","register_field_password","register_field_company","register_field_voen",
  "register_btn","register_btn_loading",
  "register_terms_prefix","register_terms_link","register_privacy_link","register_terms_suffix",
  "register_success","register_error",
  "forgot_title","forgot_subtitle",
  "forgot_field_phone","forgot_field_email","forgot_field_email_placeholder",
  "forgot_btn_send","forgot_btn_sending",
  "forgot_otp_label","forgot_otp_placeholder",
  "forgot_new_password","forgot_new_password_placeholder",
  "forgot_confirm_password","forgot_confirm_password_placeholder",
  "forgot_btn_reset","forgot_btn_resetting","forgot_btn_back",
  "forgot_success_title","forgot_success_redirect","forgot_success_login",
  "forgot_back_to_login","forgot_create_account",
  "forgot_error_send","forgot_error_reset",
  "role_select_eyebrow","role_select_title",
  "role_carrier_title","role_carrier_desc",
  "role_owner_title","role_owner_desc",
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