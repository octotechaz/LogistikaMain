import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_TOPBAR: { id: string; href: string }[] = [
  { id: "loads", href: "/" },
  { id: "about", href: "/haqqimizda" },
  { id: "help", href: "/how-it-works" },
];

const DEFAULT_FOOTER: { id: string; href: string }[] = [
  { id: "about", href: "/haqqimizda" },
  { id: "terms", href: "/istifade-sertleri" },
  { id: "privacy", href: "/mexfilik-siyaseti" },
  { id: "rules", href: "/qaydalar" },
  { id: "contact", href: "/elaqe" },
];

export async function GET() {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: ["topbar_nav", "footer_nav"] } },
  });
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  const topbar = map["topbar_nav"] ? JSON.parse(map["topbar_nav"]) : DEFAULT_TOPBAR;
  const footer = map["footer_nav"] ? JSON.parse(map["footer_nav"]) : DEFAULT_FOOTER;

  return NextResponse.json({ ok: true, topbar, footer });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { topbar?: { id: string; href: string }[]; footer?: { id: string; href: string }[] };
    const upserts = [];
    if (body.topbar) {
      upserts.push(prisma.appSetting.upsert({
        where: { key: "topbar_nav" },
        update: { value: JSON.stringify(body.topbar) },
        create: { key: "topbar_nav", value: JSON.stringify(body.topbar) },
      }));
    }
    if (body.footer) {
      upserts.push(prisma.appSetting.upsert({
        where: { key: "footer_nav" },
        update: { value: JSON.stringify(body.footer) },
        create: { key: "footer_nav", value: JSON.stringify(body.footer) },
      }));
    }
    await Promise.all(upserts);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Saxlama xətası" }, { status: 500 });
  }
}