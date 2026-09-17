import { NextResponse } from "next/server";

const COUNTRY_LOCALE: Record<string, string> = {
  AZ: "az",
  RU: "ru",
  TR: "tr",
  BY: "ru",
  KZ: "ru",
  UA: "ru",
  UZ: "ru",
  TM: "ru",
  KG: "ru",
  TJ: "ru",
  AM: "ru",
  GE: "ru",
  MD: "ru",
};

export async function GET(request: Request) {
  try {
    const cfCountry = request.headers.get("cf-ipcountry");
    if (cfCountry && cfCountry !== "XX") {
      const locale = COUNTRY_LOCALE[cfCountry] ?? "az";
      return NextResponse.json({ locale });
    }

    const cfIp = request.headers.get("cf-connecting-ip");
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = cfIp || (forwarded ? forwarded.split(",")[0].trim() : null);
    const url = ip ? `http://ip-api.com/json/${ip}?fields=countryCode` : "http://ip-api.com/json/?fields=countryCode";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ locale: "az" });
    const { countryCode } = await res.json();
    const locale = COUNTRY_LOCALE[countryCode as string] ?? "az";
    return NextResponse.json({ locale });
  } catch {
    return NextResponse.json({ locale: "az" });
  }
}
