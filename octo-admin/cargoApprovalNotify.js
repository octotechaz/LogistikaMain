"use strict";

const { parseAdminPhones, resolveAdminNotifyPhones } = require("./adminPhoneUtils");
const { buildAbsoluteUrl } = require("./hostConfig");

function buildPendingCargoMessage(details, adminHost, portalHost) {
  const listingNumber = details.listingNumber || details.listingId || "—";
  const adminUrl = buildAbsoluteUrl(
    adminHost,
    `/dashboard/butun-elanlar?elan=${encodeURIComponent(String(listingNumber))}`
  );
  const listingUrl = details.listingUrl
    || (details.listingId && portalHost
      ? buildAbsoluteUrl(portalHost, `/loads/${details.listingId}`)
      : null);

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

  lines.push("", "*Admin təsdiq linki:*", adminUrl);

  if (listingUrl) {
    lines.push("", "*Elan linki:*", listingUrl);
  }

  return lines.join("\n");
}

async function notifyAdminsPendingCargo({
  settingsRepository,
  backendUrl,
  adminHost,
  portalHost,
  details,
}) {
  const phones = await resolveAdminNotifyPhones({ settingsRepository, backendUrl });
  if (phones.length === 0) {
    console.warn("WhatsApp bildirişi üçün admin nömrəsi tapılmadı.");
    return { sent: 0, skipped: true };
  }

  const message = buildPendingCargoMessage(details, adminHost, portalHost);
  const response = await fetch(`${backendUrl}/api/whatsapp/send-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phones, message }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "WhatsApp bildirişi göndərilmədi.");
  }

  const payload = await response.json().catch(() => ({}));
  return { sent: payload.sent ?? phones.length, failed: payload.failed ?? [] };
}

module.exports = { buildPendingCargoMessage, notifyAdminsPendingCargo };
