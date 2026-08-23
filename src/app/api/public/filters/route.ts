import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_CITIES = ["Bakı","Sumqayıt","Gəncə","Xırdalan","Quba","Qəbələ","Mingəçevir","Şəki","Lənkəran","Masallı","Şamaxı","Naxçıvan"];
const DEFAULT_CARGO_TYPES = ["Mebel","Tikinti materialı","Kubik","Ərzaq","Texnika","Paletli yük","Soyudulmuş məhsul","Sənaye avadanlığı"];
const DEFAULT_VEHICLE_TYPES = ["Ford Transit","Kamaz","TIR","Tentli yük maşını","Soyuduculu maşın","Platforma","Konteyner daşıyan"];

export async function GET() {
  try {
    const rows = await prisma.appSetting.findMany({
      where: { key: { in: ["filters_cities", "filters_cargo_types", "filters_vehicle_types"] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const parse = (key: string, def: string[]) => {
      try { return map[key] ? JSON.parse(map[key]) : def; } catch { return def; }
    };

    return NextResponse.json({
      cities: parse("filters_cities", DEFAULT_CITIES),
      cargoTypes: parse("filters_cargo_types", DEFAULT_CARGO_TYPES),
      vehicleTypes: parse("filters_vehicle_types", DEFAULT_VEHICLE_TYPES),
    });
  } catch {
    return NextResponse.json({
      cities: DEFAULT_CITIES,
      cargoTypes: DEFAULT_CARGO_TYPES,
      vehicleTypes: DEFAULT_VEHICLE_TYPES,
    });
  }
}