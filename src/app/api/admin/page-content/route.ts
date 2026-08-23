import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SUPPORTED_LOCALES = ["az", "ru", "en", "tr"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

const ARRAY_KEYS = ["about_paragraphs", "about_advantages", "howitworks_steps"];

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
  "search_select",
  "listings_title",
  "categories_title",
  "login_eyebrow",
  "login_title",
  "login_subtitle",
  "login_tab_owner",
  "login_tab_carrier",
  "login_method_phone",
  "login_method_email",
  "login_field_phone",
  "login_field_email",
  "login_field_email_placeholder",
  "login_field_password",
  "login_field_password_placeholder",
  "login_forgot_password",
  "login_btn",
  "login_btn_loading",
  "login_btn_owner",
  "login_btn_carrier",
  "login_no_account",
  "login_register_owner",
  "login_register_carrier",
  "login_sidebar_title",
  "login_sidebar_owner_title",
  "login_sidebar_carrier_title",
  "login_sidebar_owner_desc",
  "login_sidebar_carrier_desc",
  "login_error_invalid",
  "login_error_phone",
  "login_error_email",
  "register_title",
  "register_eyebrow_owner",
  "register_eyebrow_carrier",
  "register_subtitle_owner",
  "register_subtitle_carrier",
  "register_field_firstname",
  "register_field_lastname",
  "register_field_phone",
  "register_field_email",
  "register_field_password",
  "register_field_company",
  "register_field_voen",
  "register_btn",
  "register_btn_loading",
  "register_terms_prefix",
  "register_terms_link",
  "register_privacy_link",
  "register_terms_suffix",
  "register_success",
  "register_error",
  "forgot_title",
  "forgot_subtitle",
  "forgot_field_phone",
  "forgot_field_email",
  "forgot_field_email_placeholder",
  "forgot_btn_send",
  "forgot_btn_sending",
  "forgot_otp_label",
  "forgot_otp_placeholder",
  "forgot_new_password",
  "forgot_new_password_placeholder",
  "forgot_confirm_password",
  "forgot_confirm_password_placeholder",
  "forgot_btn_reset",
  "forgot_btn_resetting",
  "forgot_btn_back",
  "forgot_success_title",
  "forgot_success_redirect",
  "forgot_success_login",
  "forgot_back_to_login",
  "forgot_create_account",
  "forgot_error_send",
  "forgot_error_reset",
  "role_select_eyebrow",
  "role_select_title",
  "role_carrier_title",
  "role_carrier_desc",
  "role_owner_title",
  "role_owner_desc",
  "carrier_highlight_1",
  "carrier_highlight_2",
  "carrier_highlight_3",
  "carrier_field_contact_phone",
  "carrier_field_whatsapp",
  "carrier_company_placeholder",
  "carrier_vehicle_type",
  "carrier_location_address",
  "carrier_location_placeholder",
  "carrier_cargo_volume",
  "carrier_cargo_volume_placeholder",
  "carrier_max_weight",
  "carrier_max_weight_placeholder",
  "carrier_cargo_types_title",
  "carrier_map_title",
  "footer_phone",
  "footer_work_hours",
  "footer_copyright",
  "footer_tagline",
  "nav_loads",
  "nav_about",
  "nav_howitworks",
  "nav_contact",
  "nav_home",
  "nav_active_loads",
  "nav_new_listing",
  "nav_panel",
  "nav_welcome",
  "nav_user",
  "nav_admin_panel",
  "nav_my_listings",
  "nav_logout",
  "footer_platform",
  "footer_legal",
  "footer_support",
  "about_advantages_title",
  "dashboard_owner_panel",
  "dashboard_carrier_panel",
  "dashboard_admin_panel",
  "dashboard_owner_default_name",
  "dashboard_carrier_default_name",
  "dashboard_nav_my_listings",
  "dashboard_nav_new_listing",
  "dashboard_nav_dashboard",
  "dashboard_nav_active_loads",
  "dashboard_nav_applications",
  "dashboard_nav_vehicles",
  "dashboard_nav_overview",
  "dashboard_nav_users",
  "dashboard_nav_listings",
  "dashboard_nav_categories",
  "dashboard_nav_banners",
  "dashboard_nav_statistics",
  "dashboard_btn_view_site",
  "dashboard_btn_logout",
  "catalog_select_placeholder","catalog_all","catalog_view_all","catalog_close","catalog_reset",
  "catalog_grid","catalog_list","catalog_all_listings","catalog_listings_shown",
  "catalog_found","catalog_listings_unit",
  "catalog_no_results","catalog_no_results_hint","catalog_no_category","catalog_no_category_hint",
  "catalog_loading","catalog_listings_loading","catalog_load_error","catalog_retry",
  "catalog_metric_qty","catalog_metric_volume","catalog_metric_weight","catalog_metric_dims",
  "catalog_filter_min_price","catalog_filter_max_price","catalog_filter_min_weight","catalog_filter_max_weight",
  "catalog_filter_date_from","catalog_filter_date_to","catalog_filter_min_volume","catalog_filter_max_volume",
  "catalog_filter_length","catalog_filter_width","catalog_filter_height",
  "catalog_chip_all","catalog_chip_general","catalog_chip_construction","catalog_chip_food",
  "catalog_chip_agri","catalog_chip_liquid","catalog_chip_cold","catalog_chip_danger","catalog_chip_other",
  "catalog_sort_newest","catalog_sort_price_desc","catalog_sort_price_asc","catalog_sort_weight_desc",
  "catalog_hiw_title","catalog_hiw_1_title","catalog_hiw_1_text",
  "catalog_hiw_2_title","catalog_hiw_2_text","catalog_hiw_3_title","catalog_hiw_3_text",
  "catalog_cta_title","catalog_cta_desc","catalog_cta_free","catalog_cta_carriers","catalog_cta_fast","catalog_cta_btn",
  "catalog_stats_title","catalog_stats_listings","catalog_stats_carriers","catalog_stats_deliveries","catalog_stats_satisfaction",
  "catalog_trust_title","catalog_trust_safe","catalog_trust_data","catalog_trust_support",
  "nav_login","nav_login_register","nav_welcome_user","nav_default_user","footer_tagline_static",
];

export async function GET(request: NextRequest) {
  const localeParam = request.nextUrl.searchParams.get("locale") ?? "az";
  const locale: Locale = SUPPORTED_LOCALES.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : "az";

  const dbKeys = CONTENT_KEYS.map((k) => `${k}_${locale}`);
  const rows = await prisma.appSetting.findMany({ where: { key: { in: dbKeys } } });
  const dbMap: Record<string, string> = {};
  for (const row of rows) dbMap[row.key] = row.value;

  const result: Record<string, unknown> = {};
  for (const key of CONTENT_KEYS) {
    const raw = dbMap[`${key}_${locale}`];
    if (raw !== undefined) {
      if (ARRAY_KEYS.includes(key)) {
        try { result[key] = JSON.parse(raw); } catch { result[key] = raw; }
      } else {
        result[key] = raw;
      }
    }
  }

  return NextResponse.json({ ok: true, locale, data: result });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { locale: string; data: Record<string, unknown> };
    const locale: Locale = SUPPORTED_LOCALES.includes(body.locale as Locale)
      ? (body.locale as Locale)
      : "az";

    const upserts = Object.entries(body.data).map(([key, value]) => {
      const dbKey = `${key}_${locale}`;
      const dbValue = typeof value === "string" ? value : JSON.stringify(value);
      return prisma.appSetting.upsert({
        where: { key: dbKey },
        update: { value: dbValue },
        create: { key: dbKey, value: dbValue },
      });
    });

    await Promise.all(upserts);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Saxlama xətası" }, { status: 500 });
  }
}