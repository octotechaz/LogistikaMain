import { ok } from "@/lib/api";

type SearchResult = {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
};

// Transliterasiya: "Mingecevir Sefa kucesi" → "Mingəçevir Şəfa küçəsi"
const CITY_MAP: Record<string, string> = {
  mingecevir: "Mingəçevir", mingacevar: "Mingəçevir", mingachevir: "Mingəçevir",
  gence: "Gəncə", ganja: "Gəncə", gandja: "Gəncə",
  shaki: "Şəki", seki: "Şəki", sheki: "Şəki",
  lenkeran: "Lənkəran", lenkaran: "Lənkəran", lankaran: "Lənkəran",
  sumqayit: "Sumqayıt", sumgait: "Sumqayıt", sumgayit: "Sumqayıt",
  xirdalan: "Xırdalan", hirdalan: "Xırdalan", khirdalan: "Xırdalan",
  naxcivan: "Naxçıvan", nahcivan: "Naxçıvan", nakhchivan: "Naxçıvan",
  qebele: "Qəbələ", gabala: "Qəbələ", kabala: "Qəbələ",
  quba: "Quba", guba: "Quba",
  qusar: "Qusar", gusar: "Qusar",
  shamkir: "Şəmkir", semkir: "Şəmkir",
  shirvan: "Şirvan", sirvan: "Şirvan",
  baku: "Bakı", baki: "Bakı",
  agdam: "Ağdam", agstafa: "Ağstafa", aghstafa: "Ağstafa",
  imishli: "İmişli", imisli: "İmişli",
  sabirabad: "Sabirabad", salyan: "Salyan",
  bilasuvar: "Biləsuvar", belasuvar: "Biləsuvar",
  masalli: "Masallı", massalli: "Masallı",
  yardimli: "Yardımlı",
  lerik: "Lerik", astara: "Astara",
  fizuli: "Füzuli", fuzuli: "Füzuli",
  jabrayil: "Cəbrayıl", jabrail: "Cəbrayıl",
  zangilan: "Zəngilan", zanglan: "Zəngilan",
  shusha: "Şuşa", shushe: "Şuşa",
  kalbacar: "Kəlbəcər", kelbecer: "Kəlbəcər",
  lachin: "Laçın", lacin: "Laçın",
  tovuz: "Tovuz", gedebey: "Gədəbəy", goranboy: "Goranboy",
  neftchala: "Neftçala", neftcala: "Neftçala",
  saatli: "Saatlı", saatly: "Saatlı",
  kurdamir: "Kürdəmir",
  ucar: "Ucar", barda: "Bərdə", berde: "Bərdə",
  terter: "Tərtər", agcabedi: "Ağcabədi",
  shamakhi: "Şamaxı", shamakhy: "Şamaxı",
  ismayilli: "İsmayıllı", ismailli: "İsmayıllı",
  gakh: "Qax", qax: "Qax",
  zagatala: "Zaqatala",
  balakan: "Balakən", balaken: "Balakən",
  oguz: "Oğuz", qabala: "Qəbələ",
  khachmaz: "Xaçmaz", xacmaz: "Xaçmaz",
  siazan: "Siyəzən", siyazan: "Siyəzən",
};

const STREET_MAP: Record<string, string> = {
  "kuce": "küçə", "kuca": "küçə", "kuc": "küçə", "st": "küçə",
  "sok": "küçə", "street": "küçə",
  "prosp": "prospekti", "prospekt": "prospekti", "pr": "prospekti",
  "avenue": "prospekti", "ave": "prospekti",
};

function normalizeQuery(text: string): string {
  let result = text.trim();

  // Şəhər adlarını çevir
  for (const [latin, az] of Object.entries(CITY_MAP)) {
    const re = new RegExp(`\\b${latin}\\b`, "gi");
    result = result.replace(re, az);
  }

  // Küçə/prospekt sözlərini çevir
  for (const [latin, az] of Object.entries(STREET_MAP)) {
    const re = new RegExp(`\\b${latin}\\b`, "gi");
    result = result.replace(re, az);
  }

  // Ümumi hərflər
  result = result
    .replace(/\bsh\b/g, "ş").replace(/sh(?=[aeiouəäöü])/gi, "ş")
    .replace(/\bch\b/g, "ç").replace(/ch(?=[aeiouəäöü])/gi, "ç")
    .replace(/(?<=[aeiouəäöü])gh(?=[aeiouəäöü])/gi, "ğ")
    .replace(/kh(?=[aeiouəäöü])/gi, "x");

  return result;
}

function buildLabel(
  name: string | undefined,
  displayName: string | undefined,
  addr: Record<string, string | undefined> | undefined
): string {
  if (!addr) {
    const segs = (displayName || "").split(",").map(s => s.trim()).filter(Boolean);
    return segs.slice(0, 3).join(", ") || name || "Seçilmiş yer";
  }
  const parts: string[] = [];
  const street = addr.road || addr.pedestrian || addr.footway || addr.path || addr.cycleway || addr.highway;
  const houseNumber = addr.house_number;
  if (street) {
    parts.push(houseNumber ? `${street} ${houseNumber}` : street);
  } else if (name && name !== addr.city && name !== addr.town && name !== addr.village) {
    parts.push(name);
  }
  const suburb = addr.suburb || addr.quarter || addr.neighbourhood || addr.city_district;
  if (suburb && suburb !== addr.city) parts.push(suburb);
  const city = addr.city || addr.town || addr.village || addr.municipality;
  if (city) parts.push(city);
  if (parts.length === 0) {
    const segs = (displayName || "").split(",").map(s => s.trim()).filter(Boolean);
    return segs.slice(0, 3).join(", ") || name || "Seçilmiş yer";
  }
  return parts.join(", ");
}

type NominatimItem = {
  name?: string; display_name?: string; lat?: string; lon?: string;
  address?: Record<string, string | undefined>;
};

async function searchNominatim(query: string): Promise<NominatimItem[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "7");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "az");
  url.searchParams.set("dedupe", "1");
  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Tranzit.AZ/1.0 (logistika platformu; contact@tranzit.az)",
        "Accept-Language": "az,ru,en",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return (await res.json()) as NominatimItem[];
  } catch { return []; }
}

type PhotonFeature = {
  type: string;
  properties: {
    name?: string; country?: string; countrycode?: string;
    city?: string; street?: string; housenumber?: string;
    district?: string; state?: string;
    osm_key?: string; osm_value?: string;
  };
  geometry: { type: string; coordinates: [number, number] };
};

async function searchPhoton(query: string): Promise<PhotonFeature[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");
  url.searchParams.set("lang", "default");
  // Azərbaycan bbox
  url.searchParams.set("bbox", "44.7,38.3,50.6,41.9");
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Tranzit.AZ/1.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json() as { features?: PhotonFeature[] };
    return (data.features || []).filter(
      f => f.properties.countrycode === "AZ" || f.properties.country === "Azerbaijan"
    );
  } catch { return []; }
}

function photonLabel(f: PhotonFeature): string {
  const p = f.properties;
  const parts: string[] = [];
  if (p.street) parts.push(p.housenumber ? `${p.street} ${p.housenumber}` : p.street);
  else if (p.name && p.name !== p.city) parts.push(p.name);
  if (p.district && p.district !== p.city) parts.push(p.district);
  if (p.city) parts.push(p.city);
  return parts.join(", ") || p.name || "Seçilmiş yer";
}

function parseNominatim(data: NominatimItem[], seen: Set<string>): SearchResult[] {
  return data.flatMap(item => {
    const lat = Number(item.lat), lng = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ label: buildLabel(item.name, item.display_name, item.address), address: item.display_name || "", latitude: lat, longitude: lng }];
  });
}

function parsePhoton(features: PhotonFeature[], seen: Set<string>): SearchResult[] {
  return features.flatMap(f => {
    const [lng, lat] = f.geometry.coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ label: photonLabel(f), address: photonLabel(f), latitude: lat, longitude: lng }];
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return ok<{ places: SearchResult[] }>({ places: [] });

  const normalized = normalizeQuery(q);
  const withCountry = /azerbaycan|azerbaijan/i.test(normalized) ? normalized : `${normalized}, Azərbaycan`;
  const seen = new Set<string>();
  let places: SearchResult[] = [];

  // 1. Nominatim — normallaşdırılmış + Azərbaycan
  const [n1, n2, photonResults] = await Promise.all([
    searchNominatim(withCountry),
    normalized !== q ? searchNominatim(`${q}, Azerbaijan`) : Promise.resolve([]),
    searchPhoton(normalized !== q ? normalized : q),
  ]);

  places = [...parseNominatim(n1, seen), ...parseNominatim(n2, seen), ...parsePhoton(photonResults, seen)];

  // 2. Hələ də az nəticə varsa — sadəcə orijinal sorğu ilə yenidən cəhd et
  if (places.length < 2 && normalized !== q) {
    const n3 = await searchNominatim(q);
    places = [...places, ...parseNominatim(n3, seen)];
  }

  return ok({ places: places.slice(0, 7) });
}