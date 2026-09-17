import { azerbaijanMapLocations } from "@/lib/azerbaijan-map-locations";

export type LatLng = { latitude: number; longitude: number };

function normalizeLabel(value: string) {
  return value
    .toLocaleLowerCase("az")
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resolve a city name to coordinates using the shared Azerbaijan locations source. */
export function resolveCoordinates(value?: string | null): LatLng | null {
  if (!value) {
    return null;
  }

  const needle = normalizeLabel(value);

  const exact = azerbaijanMapLocations.find(
    (location) => normalizeLabel(location.label) === needle
  );

  if (exact) {
    return { latitude: exact.latitude, longitude: exact.longitude };
  }

  // Allow partial match (e.g. a city embedded in a longer label like "Bakı, Babək prospekti").
  const partial = azerbaijanMapLocations.find((location) =>
    needle.includes(normalizeLabel(location.label))
  );

  return partial ? { latitude: partial.latitude, longitude: partial.longitude } : null;
}

const EARTH_RADIUS_KM = 6371;

/** Haversine great-circle distance in kilometres. */
export function distanceKm(from: LatLng, to: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/** Approximate real road distance (km) from straight-line distance. */
export function approximateRoadDistanceKm(straightLineKm: number): number {
  return Math.round(straightLineKm * 1.3);
}

const ROUTE_SEPARATORS = ["-", "–", "—", "→", "->", "=>", "dan", "dən", "to"];

/** Split a route entry into its endpoint city tokens. Supports "Bakı-Gəncə", "Bakı → Gəncə", etc. */
export function parseRouteTokens(route: string): string[] {
  const raw = route.replace(/\s+/g, " ").trim();
  if (!raw) {
    return [];
  }

  // Normalize various separators to a single token boundary.
  const parts = raw
    .split(new RegExp(ROUTE_SEPARATORS.join("|"), "i"))
    .map((part) => normalizeLabel(part))
    .filter(Boolean);

  return parts;
}

export function normalizeCity(value: string) {
  return normalizeLabel(value);
}
