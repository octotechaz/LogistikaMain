import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  footer_phone: "+994 50 123 45 67",
  footer_whatsapp: "994501234567",
  footer_email: "info@tranzit.az",
  footer_telegram: "tranzitaz",
  footer_work_hours: "Hər gün 09:00-20:00",
  footer_copyright: "© 2026 Tranzit.AZ. Bütün hüquqlar qorunur.",
  footer_tagline: "Yük elanları və daşıma əlaqələri üçün public platforma.",
};

export async function GET() {
  try {
    const rows = await prisma.appSetting.findMany({
      where: { key: { in: Object.keys(DEFAULTS) } },
    });

    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }

    return NextResponse.json({
      phone: map.footer_phone ?? DEFAULTS.footer_phone,
      whatsapp: map.footer_whatsapp ?? DEFAULTS.footer_whatsapp,
      email: map.footer_email ?? DEFAULTS.footer_email,
      telegram: map.footer_telegram ?? DEFAULTS.footer_telegram,
      workHours: map.footer_work_hours ?? DEFAULTS.footer_work_hours,
      copyright: map.footer_copyright ?? DEFAULTS.footer_copyright,
      tagline: map.footer_tagline ?? DEFAULTS.footer_tagline,
    });
  } catch {
    return NextResponse.json({
      phone: DEFAULTS.footer_phone,
      whatsapp: DEFAULTS.footer_whatsapp,
      email: DEFAULTS.footer_email,
      telegram: DEFAULTS.footer_telegram,
      workHours: DEFAULTS.footer_work_hours,
      copyright: DEFAULTS.footer_copyright,
      tagline: DEFAULTS.footer_tagline,
    });
  }
}