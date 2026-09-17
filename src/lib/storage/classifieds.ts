import { defaultBanners, defaultListings, defaultOwners } from "@/lib/mock-data/classifieds";
import {
  calculateVolumeFromDimensions,
  normalizeQuantityValue
} from "@/lib/cargo-measurements";
import {
  calculateExpiresAtFromPickupDeadline,
  derivePickupDeadlineFromLegacyDuration,
  normalizePickupDeadlineDateValue
} from "@/lib/pickup-deadline";
import { effectiveStatus } from "@/lib/status/classifieds";
import type { Banner, CargoListing, CargoOwner } from "@/types/classifieds";

export const classifiedsKeys = {
  owners: "loqistika-classifieds-owners",
  listings: "loqistika-classifieds-listings",
  banners: "loqistika-classifieds-banners"
} as const;

export const classifiedsStorageEvent = "classifieds-storage-change";

function nowIso() {
  return new Date().toISOString();
}

function repairTextValue(value: string) {
  if (!/[ÃÅÆÂâ]/.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
    const repaired = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return repaired || value;
  } catch {
    return value;
  }
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(key);
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
}

function ensureArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? value : fallback;
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
  emitClassifiedsStorageChange();
}

export function emitClassifiedsStorageChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(classifiedsStorageEvent));
}

export function normalizeOwners(items: CargoOwner[]) {
  let changed = false;

  const normalized = items.map((item) => {
    const next: CargoOwner = {
      ...item,
      firstName: repairTextValue(item.firstName),
      lastName: repairTextValue(item.lastName),
      phone: repairTextValue(item.phone),
      companyName: item.companyName ? repairTextValue(item.companyName) : item.companyName,
      taxId: item.taxId ? repairTextValue(item.taxId) : item.taxId,
      role: item.role ?? "CARGO_OWNER",
      status: item.status ?? "ACTIVE",
      registeredAt: item.registeredAt ?? nowIso()
    };

    if (
      next.role !== item.role ||
      next.status !== item.status ||
      next.registeredAt !== item.registeredAt
    ) {
      changed = true;
    }

    return next;
  });

  return { items: normalized, changed };
}

export function normalizeListings(items: CargoListing[]) {
  let changed = false;

  const normalized = items.map((item) => {
    const normalizedQuantity = normalizeQuantityValue(item.quantity);
    const normalizedVolume =
      calculateVolumeFromDimensions(item.length, item.width, item.height) ?? item.volume ?? null;
    const pickupDeadlineDate =
      normalizePickupDeadlineDateValue(item.pickupDeadlineDate) ||
      (item.durationDays
        ? derivePickupDeadlineFromLegacyDuration(item.createdAt, item.durationDays)
        : "");
    const expiresAt =
      item.expiresAt ??
      (pickupDeadlineDate ? calculateExpiresAtFromPickupDeadline(pickupDeadlineDate).toISOString() : null);
    const next: CargoListing = {
      ...item,
      ownerName: repairTextValue(item.ownerName),
      ownerPhone: repairTextValue(item.ownerPhone),
      title: repairTextValue(item.title),
      cargoType: repairTextValue(item.cargoType),
      description: repairTextValue(item.description),
      quantity: normalizedQuantity || "",
      pickupCity: repairTextValue(item.pickupCity),
      pickupAddress: repairTextValue(item.pickupAddress),
      deliveryCity: repairTextValue(item.deliveryCity),
      deliveryAddress: repairTextValue(item.deliveryAddress),
      pickupDeadlineDate,
      pickupTime: item.pickupTime ? repairTextValue(item.pickupTime) : item.pickupTime,
      vehicleType: item.vehicleType ? repairTextValue(item.vehicleType) : item.vehicleType,
      note: item.note ? repairTextValue(item.note) : item.note,
      needsLoadingHelp: item.needsLoadingHelp ? repairTextValue(item.needsLoadingHelp) : item.needsLoadingHelp,
      needsUnloadingHelp: item.needsUnloadingHelp ? repairTextValue(item.needsUnloadingHelp) : item.needsUnloadingHelp,
      requiresInvoice: item.requiresInvoice ? repairTextValue(item.requiresInvoice) : item.requiresInvoice,
      roundTrip: item.roundTrip ? repairTextValue(item.roundTrip) : item.roundTrip,
      volume: normalizedVolume ?? undefined,
      photo: item.photo ? repairTextValue(item.photo) : item.photo,
      photos: item.photos?.map((photo) => repairTextValue(photo)),
      price: typeof item.price === "string" ? repairTextValue(item.price) : item.price,
      rejectionReason: item.rejectionReason ? repairTextValue(item.rejectionReason) : item.rejectionReason ?? null,
      approvedAt: item.approvedAt ?? null,
      expiresAt,
      deactivatedAt: item.deactivatedAt ?? null,
      status: effectiveStatus({
        ...item,
        pickupDeadlineDate,
        rejectionReason: item.rejectionReason ? repairTextValue(item.rejectionReason) : item.rejectionReason ?? null,
        approvedAt: item.approvedAt ?? null,
        expiresAt
      })
    };

    if (
      next.quantity !== item.quantity ||
      next.volume !== item.volume ||
      next.pickupDeadlineDate !== item.pickupDeadlineDate ||
      next.rejectionReason !== item.rejectionReason ||
      next.approvedAt !== item.approvedAt ||
      next.expiresAt !== item.expiresAt ||
      next.deactivatedAt !== item.deactivatedAt ||
      next.status !== item.status
    ) {
      changed = true;
    }

    return next;
  });

  return { items: normalized, changed };
}

export function getStoredOwners() {
  const normalized = normalizeOwners(ensureArray(readJson(classifiedsKeys.owners, defaultOwners), defaultOwners));
  if (normalized.changed) {
    writeJson(classifiedsKeys.owners, normalized.items);
  }
  return normalized.items;
}

export function setStoredOwners(items: CargoOwner[]) {
  writeJson(classifiedsKeys.owners, items);
}

export function getStoredListings() {
  const stored = ensureArray(readJson(classifiedsKeys.listings, defaultListings), defaultListings);
  const defaultOnly = defaultListings.filter(
    (seedListing) => !stored.some((storedListing) => storedListing.id === seedListing.id)
  );
  const normalized = normalizeListings([...stored, ...defaultOnly]);
  if (normalized.changed || defaultOnly.length > 0) {
    writeJson(classifiedsKeys.listings, normalized.items);
  }
  return normalized.items;
}

export function setStoredListings(items: CargoListing[]) {
  writeJson(classifiedsKeys.listings, items);
}

export function getStoredBanners() {
  const banners = ensureArray(readJson<Banner[]>(classifiedsKeys.banners, defaultBanners), defaultBanners);
  const normalized = banners.map((item) => ({
    ...item,
    label: item.label ? repairTextValue(item.label) : item.label,
    title: repairTextValue(item.title),
    description: repairTextValue(item.description),
    ctaText: item.ctaText ? repairTextValue(item.ctaText) : item.ctaText,
    ctaLink: item.ctaLink ? repairTextValue(item.ctaLink) : item.ctaLink
  }));

  if (JSON.stringify(normalized) !== JSON.stringify(banners)) {
    writeJson(classifiedsKeys.banners, normalized);
  }

  return normalized;
}

export function setStoredBanners(items: Banner[]) {
  writeJson(classifiedsKeys.banners, items);
}