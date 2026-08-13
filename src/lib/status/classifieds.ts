import { isExpiredByDate } from "@/lib/pickup-deadline";
import type { CargoListing, ListingStatus } from "@/types/classifieds";

export const listingStatusLabels: Record<ListingStatus, string> = {
  PENDING: "Gözləmədə",
  ACTIVE: "Aktiv",
  REJECTED: "Rədd edildi",
  EXPIRED: "Vaxtı keçib",
  INACTIVE: "Deaktiv",
  DELETED: "Silinib"
};

export const listingStatusTone: Record<
  ListingStatus,
  "green" | "yellow" | "red" | "blue" | "gray"
> = {
  PENDING: "yellow",
  ACTIVE: "green",
  REJECTED: "red",
  EXPIRED: "gray",
  INACTIVE: "blue",
  DELETED: "gray"
};

export function effectiveStatus(listing: CargoListing): ListingStatus {
  const status = String(listing.status);

  if (status === "CANCELLED" || status === "DELETED") {
    return "DELETED";
  }

  if (status === "ACTIVE" && isExpiredByDate(listing.expiresAt)) {
    return "EXPIRED";
  }

  if (status === "ASSIGNED" || status === "IN_PROGRESS" || status === "COMPLETED") {
    return "ACTIVE";
  }

  if (
    status === "PENDING" ||
    status === "ACTIVE" ||
    status === "REJECTED" ||
    status === "EXPIRED" ||
    status === "INACTIVE"
  ) {
    return status;
  }

  return "ACTIVE";
}

export function isPublicListing(listing: CargoListing) {
  // Veritabanından gelen veride expiresAt olmayabiliyor ve biz sitede ACTIVE diye döndürüyoruz, bu nedenle sadece durumu kontrol et
  return effectiveStatus(listing) === "ACTIVE";
}
