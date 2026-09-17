import "server-only";

import { formatListingDate, formatPrice, formatWeight } from "@/lib/classifieds-format";
import { buildAbsoluteUrl, parseAdminPhones } from "@/lib/admin-whatsapp-notify";

export type CargoApplicationNotifyDetails = {
  applicationId: string;
  listingId: string;
  ownerPhone: string;
  cargoName: string;
  cargoType: string;
  pickupCity: string;
  deliveryCity: string;
  pickupDate: Date;
  weight: number;
  volume?: number | null;
  quantity?: string | null;
  proposedPrice?: number | string | null;
  priceNegotiable?: boolean;
  offeredPrice?: number | string | null;
  applicationMessage?: string | null;
  carrierName: string;
  carrierPhone: string;
  vehicleType: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string;
  driverName: string;
  driverPhone: string;
  vehicleCapacityTons: number;
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

export function buildCargoApplicationMessage(details: CargoApplicationNotifyDetails) {
  const portalHost = resolvePortalHost();
  const applicationsUrl = buildAbsoluteUrl(portalHost, "/cargo-owner/applications");
  const listingUrl = buildAbsoluteUrl(portalHost, `/loads/${details.listingId}`);

  const lines = [
    "*YENİ MÜRACİƏT* 📦",
    "",
    "*Yük elanı:*",
    `• Başlıq: ${details.cargoName}`,
    `• Yük növü: ${details.cargoType}`,
    `• Marşrut: ${details.pickupCity} → ${details.deliveryCity}`,
    `• Tarix: ${formatListingDate(details.pickupDate.toISOString())}`,
    `• Çəki: ${formatWeight(details.weight)}`,
  ];

  const volume = formatVolume(details.volume);
  if (volume) {
    lines.push(`• Həcm: ${volume}`);
  }

  if (details.quantity?.trim()) {
    lines.push(`• Say: ${details.quantity}`);
  }

  lines.push(
    `• Elan qiyməti: ${details.priceNegotiable ? "Razılaşma ilə" : formatPrice(details.proposedPrice ?? undefined)}`,
    "",
    "*Müraciət detalları:*",
    `• Təklif qiyməti: ${formatPrice(details.offeredPrice ?? undefined)}`,
  );

  if (details.applicationMessage?.trim()) {
    lines.push(`• Mesaj: ${details.applicationMessage.trim()}`);
  }

  lines.push(
    "",
    "*Daşıyıcı:*",
    `• Ad: ${details.carrierName}`,
    `• Telefon: ${details.carrierPhone}`,
    "",
    "*Avtomobil:*",
    `• Növ: ${details.vehicleType}`,
    `• Marka/Model: ${details.vehicleBrand} ${details.vehicleModel}`,
    `• Nömrə: ${details.vehiclePlate}`,
    `• Tonnaj: ${details.vehicleCapacityTons} ton`,
    `• Sürücü: ${details.driverName}`,
    `• Sürücü telefonu: ${details.driverPhone}`,
    "",
    "*Müraciətləri idarə et:*",
    applicationsUrl,
    "",
    "*Elan linki:*",
    listingUrl,
  );

  return lines.join("\n");
}

function resolveOwnerPhone(raw: string): string | null {
  const phones = parseAdminPhones(raw);
  return phones[0] ?? null;
}

export async function notifyCargoOwnerNewApplication(details: CargoApplicationNotifyDetails) {
  const phone = resolveOwnerPhone(details.ownerPhone);
  if (!phone) {
    console.warn("Yük sahibi üçün WhatsApp nömrəsi tapılmadı:", details.ownerPhone);
    return { skipped: true as const };
  }

  const backendUrl = process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:4001";
  const message = buildCargoApplicationMessage(details);

  const response = await fetch(`${backendUrl}/api/whatsapp/send-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phones: [phone], message }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "WhatsApp bildirişi göndərilmədi.");
  }

  return response.json().catch(() => ({ success: true }));
}
