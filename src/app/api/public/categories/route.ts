import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dbPath =
      process.env.PUBLIC_LISTINGS_SQLITE_PATH ||
      path.join(process.cwd(), "data", "public-listings.sqlite");
    const fs = await import("node:fs");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new Database(dbPath, { fileMustExist: false });

    // public_categories table may not exist yet, but it gets created by octo-admin.
    // Try to get categories from the db
    const tableExists = db
      .prepare("SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'public_categories' LIMIT 1")
      .get() as { ok: number } | undefined;

    if (!tableExists) {
      db.close();
      throw new Error("public_categories missing");
    }

    const categories = db.prepare("SELECT * FROM public_categories WHERE is_active = 1 ORDER BY sort_order ASC, label ASC").all();
    db.close();

    // SQLite'dan gelen veriyi Next.js component'inin beklediği formata çeviriyoruz
    const formattedCategories = categories.map((cat: any) => ({
      id: cat.id,
      label: cat.label,
      iconKey: cat.icon_key,
      iconTone: cat.icon_tone,
      matchCargoType: cat.match_cargo_type,
      sortOrder: cat.sort_order,
      isActive: cat.is_active === 1
    }));
    
    return NextResponse.json({ data: formattedCategories });
  } catch (error) {
    console.error("Categories fetch error:", error);
    // Fallback data in case of error (or if table doesn't exist yet)
    const fallbackCategories = [
      {
        id: "cat-1",
        label: "Ev əşyaları",
        iconKey: "couch",
        iconTone: "text-amber-500",
        matchCargoType: "Ev",
        sortOrder: 1,
        isActive: true
      },
      {
        id: "cat-2",
        label: "Tikinti",
        iconKey: "hammer",
        iconTone: "text-slate-500",
        matchCargoType: "Tikinti",
        sortOrder: 2,
        isActive: true
      },
      {
        id: "cat-3",
        label: "Qida",
        iconKey: "apple-whole",
        iconTone: "text-green-500",
        matchCargoType: "Erzaq",
        sortOrder: 3,
        isActive: true
      },
      {
        id: "cat-4",
        label: "Digər",
        iconKey: "box",
        iconTone: "text-blue-500",
        matchCargoType: "Diger",
        sortOrder: 4,
        isActive: true
      }
    ];
    return NextResponse.json({ data: fallbackCategories });
  }
}
