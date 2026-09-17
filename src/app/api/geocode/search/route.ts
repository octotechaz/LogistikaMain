import { ok } from "@/lib/api";

const AZ_VIEWBOX = "44.7,41.8,50.6,38.3";

type SearchResult = {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
};

function extractLabel(name: string | undefined, address: Record<string, string | undefined> | undefined): string {
  if (address?.city) return address.city;
  if (address?.town) return address.town;
  if (address?.village) return address.village;
  if (address?.suburb) return address.suburb;
  if (address?.municipality) return address.municipality;
  if (name && name.trim()) return name.trim();
  return "Seçilmiş yer";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return ok<{ places: SearchResult[] }>({ places: [] });
  }

  try {
    const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
    nominatimUrl.searchParams.set("format", "json");
    nominatimUrl.searchParams.set("q", q);
    nominatimUrl.searchParams.set("limit", "6");
    nominatimUrl.searchParams.set("addressdetails", "1");
    nominatimUrl.searchParams.set("countrycodes", "az");
    nominatimUrl.searchParams.set("viewbox", AZ_VIEWBOX);
    nominatimUrl.searchParams.set("bounded", "1");

    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "Tranzit.AZ/1.0 (https://tranzit.az; address autocomplete)",
        "Accept-Language": "az,en",
      },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return ok({ places: [] });
    }

    const data = (await response.json()) as Array<{
      name?: string;
      display_name?: string;
      lat?: string;
      lon?: string;
      address?: Record<string, string | undefined>;
    }>;

    const places: SearchResult[] = data
      .map((item) => {
        const latitude = Number(item.lat);
        const longitude = Number(item.lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
        return {
          label: extractLabel(item.name, item.address),
          address: item.display_name || item.name || "",
          latitude,
          longitude,
        };
      })
      .filter((place): place is SearchResult => place !== null && place.address !== "");

    return ok({ places });
  } catch (error) {
    console.error("[geocode/search]", error);
    return ok({ places: [] });
  }
}