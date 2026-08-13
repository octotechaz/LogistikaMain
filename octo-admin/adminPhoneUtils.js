"use strict";

const { normalizeInternationalPhone } = require("./phoneUtils");

/**
 * Parse one or many admin notification phones from a stored setting value.
 * Accepts newline, comma, or semicolon separated lists.
 * Invalid entries are skipped; duplicates are removed.
 */
function parseAdminPhones(raw) {
  if (typeof raw !== "string" || raw.trim() === "") {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  for (const part of raw.split(/[\n,;]+/)) {
    const candidate = part.trim();
    if (!candidate) continue;

    try {
      const phone = normalizeInternationalPhone(candidate);
      if (!seen.has(phone)) {
        seen.add(phone);
        normalized.push(phone);
      }
    } catch {
      // Skip malformed entries so one bad number does not block the rest.
    }
  }

  return normalized;
}

/** Serialize admin phones for storage (one per line). */
function serializeAdminPhones(phones) {
  return phones.join("\n");
}

async function fetchConnectedWhatsAppPhones(backendUrl) {
  if (!backendUrl) {
    return [];
  }

  try {
    const response = await fetch(`${backendUrl}/api/whatsapp/status`);
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (typeof data.connectedPhone !== "string" || data.connectedPhone.trim() === "") {
      return [];
    }

    return parseAdminPhones(data.connectedPhone);
  } catch {
    return [];
  }
}

/**
 * Resolve phones for pending-cargo WhatsApp alerts.
 * 1) QR ilə bağlanmış WhatsApp nömrəsi (backend status)
 * 2) whatsapp_admin_phone setting (əlavə nömrələr)
 */
async function resolveAdminNotifyPhones({ settingsRepository, backendUrl }) {
  const connected = await fetchConnectedWhatsAppPhones(backendUrl);
  const configured = parseAdminPhones(
    await settingsRepository.getSetting("whatsapp_admin_phone", "")
  );

  const seen = new Set();
  const phones = [];

  for (const phone of [...connected, ...configured]) {
    if (!seen.has(phone)) {
      seen.add(phone);
      phones.push(phone);
    }
  }

  return phones;
}

/** QR ilə bağlananda boş ayarı avtomatik doldur. */
async function syncConnectedWhatsAppPhone({ settingsRepository, connectedPhone }) {
  const phones = parseAdminPhones(connectedPhone);
  if (phones.length === 0) {
    return false;
  }

  const current = parseAdminPhones(
    await settingsRepository.getSetting("whatsapp_admin_phone", "")
  );
  if (current.length > 0) {
    return false;
  }

  await settingsRepository.setSetting(
    "whatsapp_admin_phone",
    serializeAdminPhones(phones)
  );
  return true;
}

module.exports = {
  parseAdminPhones,
  serializeAdminPhones,
  fetchConnectedWhatsAppPhones,
  resolveAdminNotifyPhones,
  syncConnectedWhatsAppPhone,
};
