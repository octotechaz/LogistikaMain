import { fail, ok } from "@/lib/api";
import { carrierLocationOptions } from "@/lib/constants";

function nearestCityLabel(lat: number, lng: number): string {
  let bestLabel: string = carrierLocationOptions[0].label;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const city of carrierLocationOptions) {
    const dLat = city.latitude - lat;
    const dLng = city.longitude - lng;
    const distance = dLat * dLat + dLng * dLng;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestLabel = city.label;
    }
  }

  return bestLabel;
}

function extractLabel(address: Record<string, string | undefined> | undefined): string | null {
  if (!address) return null;
  return (
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    address.state ||
    null
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return fail("lat and lon are required", 400);
  }

  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return fail("Invalid coordinates", 400);
  }

  try {
    const nominatimUrl = new URL("https://nominatim.openstreetmap.org/reverse");
    nominatimUrl.searchParams.set("format", "json");
    nominatimUrl.searchParams.set("lat", String(latitude));
    nominatimUrl.searchParams.set("lon", String(longitude));
    nominatimUrl.searchParams.set("zoom", "10");
    nominatimUrl.searchParams.set("addressdetails", "1");

    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "Tranzit.AZ/1.0 (https://tranzit.az; carrier registration)",
        "Accept-Language": "az,en",
      },
      next: { revalidate: 86400 },
    });

    if (response.ok) {
      const data = (await response.json()) as {
        address?: Record<string, string | undefined>;
      };
      const label = extractLabel(data.address);
      if (label) {
        return ok({ label });
      }
    }
  } catch (error) {
    console.error("[geocode/reverse]", error);
  }

  return ok({ label: nearestCityLabel(latitude, longitude) });
}
