import { buildAbsoluteUrl } from "@/lib/admin-whatsapp-notify";
import { formatListingDate, formatPrice, formatWeight } from "@/lib/classifieds-format";

export type MatchMessageDetails = {
  cargoPostId: string;
  listingId?: string | number | null;
  cargoName: string;
  cargoType: string;
  pickupCity: string;
  pickupAddress?: string | null;
  deliveryCity: string;
  deliveryAddress?: string | null;
  weight: number;
  volume?: number | null;
  pickupDate: Date;
  pickupTime?: string | null;
  requiredVehicleType: string;
  proposedPrice?: number | string | null;
  priceNegotiable: boolean;
  distanceKm?: number | null;
};

function resolvePortalHost() {
  return process.env.PORTAL_HOST || process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") || "portal.lvh.me:3001";
}

function formatVolume(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return null;
  }
  return `${value} m³`;
}

export function buildDriverMatchMessage(details: MatchMessageDetails) {
  const portalHost = resolvePortalHost();
  const listingId = details.listingId ?? details.cargoPostId;
  const listingUrl = buildAbsoluteUrl(portalHost, `/loads/${listingId}`);

  const lines = [
    "*YENİ YÜK TƏKLİFİ* 🚛",
    "",
    `*Yük:* ${details.cargoName}`,
    `*Növ:* ${details.cargoType}`,
    "",
    `*Yükləmə:* ${details.pickupCity}`,
  ];

  if (details.pickupAddress?.trim()) {
    lines.push(`📍 ${details.pickupAddress.trim()}`);
  }

  lines.push(`*Çatdırılma:* ${details.deliveryCity}`);

  if (details.deliveryAddress?.trim()) {
    lines.push(`📍 ${details.deliveryAddress.trim()}`);
  }

  lines.push("", "*Yük məlumatları:*");
  lines.push(`• Çəki: ${formatWeight(details.weight)}`);

  const volume = formatVolume(details.volume);
  if (volume) {
    lines.push(`• Həcm: ${volume}`);
  }

  const dateText = formatListingDate(details.pickupDate.toISOString());
  const timeText = details.pickupTime?.trim();
  lines.push(`• Yükləmə vaxtı: ${timeText ? `${dateText} • ${timeText}` : dateText}`);

  if (details.distanceKm) {
    lines.push(`• Təxmini yol: ~${details.distanceKm} km`);
  }

  lines.push(`• Avtomobil: ${details.requiredVehicleType}`);

  const price = details.priceNegotiable ? "Razılaşma ilə" : formatPrice(details.proposedPrice ?? undefined);
  lines.push(`• Qiymət: ${price}`, "");

  lines.push(`*Elan linki:*`, listingUrl);

  return lines.join("\n");
}
