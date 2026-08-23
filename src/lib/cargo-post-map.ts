import type { CargoListing, ListingStatus } from "@/types/classifieds";

export function mapAdminAndCargoStatusToListingStatus(input: {
  status?: unknown;
  legacyAdminStatus?: unknown;
  deactivatedAt?: unknown;
  expiresAt?: unknown;
}): ListingStatus {
  const rawStatus = String(input.status || "ACTIVE");
  const adminStatus = String(input.legacyAdminStatus || "APPROVED").toUpperCase();

  if (input.deactivatedAt) {
    return "DELETED";
  }

  if (adminStatus === "PENDING") {
    return "PENDING";
  }

  if (adminStatus === "REJECTED") {
    return "REJECTED";
  }

  if (rawStatus === "CANCELLED" || rawStatus === "DELETED") {
    return "DELETED";
  }

  if (rawStatus === "EXPIRED") {
    return "EXPIRED";
  }

  if (rawStatus === "ACTIVE" || rawStatus === "ASSIGNED" || rawStatus === "IN_PROGRESS" || rawStatus === "COMPLETED") {
    return "ACTIVE";
  }

  return "ACTIVE";
}

export function mapApiCargoPostToListing(
  item: Record<string, unknown>,
  fallbackPhone = ""
): CargoListing {
  const profile = item.cargoOwnerProfile as Record<string, unknown> | undefined;
  const user = profile?.user as Record<string, unknown> | undefined;
  const images = item.images as Array<Record<string, unknown>> | undefined;
  const status = mapAdminAndCargoStatusToListingStatus(item);

  return {
    id: String(item.id),
    ownerId: String(item.ownerId || ""),
    ownerName:
      String(profile?.companyName || "") ||
      String(user?.firstName || "") ||
      "",
    ownerPhone: String(item.contactPhone || fallbackPhone),
    title: String(item.cargoName || ""),
    cargoType: String(item.cargoType || ""),
    description: String(item.description || ""),
    translations: item.translations as Record<string, { title?: string; description?: string }> | undefined,
    weight: Number(item.weight || 0),
    volume: item.volume == null ? undefined : Number(item.volume),
    length: item.length == null ? undefined : Number(item.length),
    width: item.width == null ? undefined : Number(item.width),
    height: item.height == null ? undefined : Number(item.height),
    quantity: item.quantity == null ? undefined : String(item.quantity),
    pickupCity: String(item.pickupCity || ""),
    pickupAddress: String(item.pickupAddress || ""),
    deliveryCity: String(item.deliveryCity || ""),
    deliveryAddress: String(item.deliveryAddress || ""),
    pickupDate: toDateInputValue(item.pickupDate),
    pickupDeadlineDate: toDateInputValue(item.pickupDeadlineDate || item.pickupDate),
    pickupTime: item.legacyPickupTime == null ? undefined : String(item.legacyPickupTime),
    vehicleType: String(item.requiredVehicleType || "Fərq etməz"),
    price: item.proposedPrice == null ? "" : String(item.proposedPrice),
    note: item.legacyNote == null ? undefined : String(item.legacyNote),
    needsLoadingHelp: item.needsLoadingHelp == null ? undefined : String(item.needsLoadingHelp),
    needsUnloadingHelp:
      item.needsUnloadingHelp == null ? undefined : String(item.needsUnloadingHelp),
    requiresInvoice: item.requiresInvoice == null ? undefined : String(item.requiresInvoice),
    roundTrip: item.roundTrip == null ? undefined : String(item.roundTrip),
    createdAt: String(item.createdAt || new Date().toISOString()),
    expiresAt: String(item.expiresAt || ""),
    deactivatedAt: item.deactivatedAt == null ? null : String(item.deactivatedAt),
    rejectionReason: null,
    status,
    photo: String(images?.[0]?.url || ""),
    photos: images?.map((image) => String(image.url || "")).filter(Boolean) || []
  };
}

export function toDateInputValue(value: unknown) {
  if (!value) {
    return "";
  }

  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw.slice(0, 10);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
