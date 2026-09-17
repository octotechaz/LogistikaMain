import "server-only";

import { prisma } from "@/lib/prisma";

const PHONE_ALLOWED_RE = /^\+?[\d\s().-]+$/;

function isLocalDevHost(host: string): boolean {
  const bare = host.split(":")[0].toLowerCase();
  return (
    bare === "localhost" ||
    bare.endsWith(".localhost") ||
    bare === "127.0.0.1" ||
    bare === "::1" ||
    bare === "[::1]" ||
    bare === "tranzit.test" ||
    bare.endsWith(".tranzit.test") ||
    bare === "lvh.me" ||
    bare.endsWith(".lvh.me")
  );
}

function resolveUrlScheme(host: string): "http" | "https" {
  if (isLocalDevHost(host)) return "http";
  return process.env.NODE_ENV === "production" ? "https" : "http";
}

function buildAbsoluteUrl(host: string, pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${resolveUrlScheme(host)}://${host}${path}`;
}

function normalizeAdminPhone(raw: string): string | null {
  const candidate = raw.trim();
  if (!candidate || !PHONE_ALLOWED_RE.test(candidate)) {
    return null;
  }

  const digits = candidate.replace(/\D/g, "");
  if (digits.startsWith("994") && digits.length === 12) {
    return digits;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return "994" + digits.slice(1);
  }
  if (digits.length === 9) {
    return "994" + digits;
  }
  if (digits.length >= 8 && digits.length <= 15) {
    return digits;
  }

  return null;
}

export function parseAdminPhones(raw: string | null | undefined): string[] {
  if (!raw || raw.trim() === "") {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const part of raw.split(/[\n,;]+/)) {
    const phone = normalizeAdminPhone(part);
    if (phone && !seen.has(phone)) {
      seen.add(phone);
      normalized.push(phone);
    }
  }

  return normalized;
}

type PendingCargoDetails = {
  listingId: string;
  listingNumber?: string | number | null;
  listingUrl?: string | null;
  title: string;
  cargoType: string;
  pickupCity: string;
  deliveryCity: string;
  contactPhone: string;
  ownerName?: string | null;
};

type PendingVehicleDetails = {
  vehicleId: string;
  brand: string;
  model: string;
  plateNumber: string;
  vehicleType: string;
  driverPhone: string;
  carrierName?: string | null;
};

function resolvePortalHost() {
  return process.env.PORTAL_HOST || process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") || "portal.lvh.me:3001";
}

function resolveAdminHost() {
  return process.env.ADMIN_HOST || "admin.lvh.me:3005";
}

function buildPendingCargoMessage(details: PendingCargoDetails) {
  const adminHost = resolveAdminHost();
  const portalHost = resolvePortalHost();
  const listingNumber = details.listingNumber ?? details.listingId;
  const adminUrl = buildAbsoluteUrl(
    adminHost,
    `/dashboard/butun-elanlar?elan=${encodeURIComponent(String(listingNumber))}`
  );
  const listingUrl =
    details.listingUrl ??
    buildAbsoluteUrl(portalHost, `/loads/${details.listingId}`);

  const lines = [
    "*YENİ ELAN ONAY GÖZLƏYİR* 🚨",
    "",
    `*Elan №:* #${listingNumber}`,
    `*Başlıq:* ${details.title}`,
    `*Yük növü:* ${details.cargoType}`,
    `*Marşrut:* ${details.pickupCity} → ${details.deliveryCity}`,
    `*Əlaqə:* ${details.contactPhone}`,
  ];

  if (details.ownerName) {
    lines.push(`*İstifadəçi:* ${details.ownerName}`);
  }

  lines.push("", "*Admin təsdiq linki:*", adminUrl, "", "*Elan linki:*", listingUrl);
  return lines.join("\n");
}

function buildPendingVehicleMessage(details: PendingVehicleDetails) {
  const adminHost = resolveAdminHost();
  const adminUrl = buildAbsoluteUrl(
    adminHost,
    `/dashboard/avtomobiller?vehicle=${encodeURIComponent(details.vehicleId)}`
  );

  const lines = [
    "*YENİ AVTOMOBİL ONAY GÖZLƏYİR* 🚚",
    "",
    `*ID:* ${details.vehicleId}`,
    `*Avtomobil:* ${details.brand} ${details.model}`,
    `*Nömrə:* ${details.plateNumber}`,
    `*Növ:* ${details.vehicleType}`,
    `*Sürücü telefonu:* ${details.driverPhone}`,
  ];

  if (details.carrierName) {
    lines.push(`*Daşıyıcı:* ${details.carrierName}`);
  }

  lines.push("", "*Admin təsdiq linki:*", adminUrl);
  return lines.join("\n");
}

async function fetchConnectedWhatsAppPhones(): Promise<string[]> {
  const backendUrl = process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:4001";

  try {
    const response = await fetch(`${backendUrl}/api/whatsapp/status`, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as { connectedPhone?: string };
    if (!data.connectedPhone?.trim()) {
      return [];
    }

    return parseAdminPhones(data.connectedPhone);
  } catch {
    return [];
  }
}

export async function resolveAdminNotifyPhones(): Promise<string[]> {
  const connected = await fetchConnectedWhatsAppPhones();
  const setting = await prisma.appSetting.findUnique({
    where: { key: "whatsapp_admin_phone" },
  });
  const configured = parseAdminPhones(setting?.value);

  const seen = new Set<string>();
  const phones: string[] = [];

  for (const phone of [...connected, ...configured]) {
    if (!seen.has(phone)) {
      seen.add(phone);
      phones.push(phone);
    }
  }

  return phones;
}

export async function notifyAdminsPendingCargo(details: PendingCargoDetails) {
  const phones = await resolveAdminNotifyPhones();
  if (phones.length === 0) {
    console.warn("WhatsApp bildirişi üçün nömrə tapılmadı. QR ilə WhatsApp bağlayın.");
    return { skipped: true as const };
  }

  const backendUrl = process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:4001";
  const message = buildPendingCargoMessage(details);

  const response = await fetch(`${backendUrl}/api/whatsapp/send-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phones, message }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "WhatsApp bildirişi göndərilmədi.");
  }

  return response.json().catch(() => ({ success: true }));
}

export async function notifyAdminsPendingVehicle(details: PendingVehicleDetails) {
  const phones = await resolveAdminNotifyPhones();
  if (phones.length === 0) {
    console.warn("WhatsApp bildirişi üçün nömrə tapılmadı. QR ilə WhatsApp bağlayın.");
    return { skipped: true as const };
  }

  const backendUrl = process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:4001";
  const message = buildPendingVehicleMessage(details);

  const response = await fetch(`${backendUrl}/api/whatsapp/send-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phones, message }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "WhatsApp bildirişi göndərilmədi.");
  }

  return response.json().catch(() => ({ success: true }));
}

export { buildAbsoluteUrl, resolveUrlScheme };
