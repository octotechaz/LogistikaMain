"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  calculateVolumeFromDimensions,
  normalizeQuantityValue
} from "@/lib/cargo-measurements";
import {
  calculateExpiresAtFromPickupDeadline,
  derivePickupDeadlineFromLegacyDuration,
  normalizePickupDeadlineDateValue
} from "@/lib/pickup-deadline";
import {
  classifiedsKeys,
  classifiedsStorageEvent,
  getStoredBanners,
  getStoredListings,
  getStoredOwners,
  setStoredBanners,
  setStoredListings,
  setStoredOwners
} from "@/lib/storage/classifieds";
import type {
  Banner,
  CargoListing,
  CargoListingDraft,
  CargoOwner
} from "@/types/classifieds";

type OwnerContext = { id: string; name: string; phone: string };

type ClassifiedsContextValue = {
  ready: boolean;
  owners: CargoOwner[];
  listings: CargoListing[];
  banners: Banner[];
  hydrate: () => void;
  saveListing: (draft: CargoListingDraft, ownerContext: OwnerContext, listingId?: string | null) => CargoListing;
  restoreListing: (listingId: string) => void;
  softDeleteListing: (listingId: string) => void;
  setOwnerStatus: (ownerId: string, status: CargoOwner["status"]) => void;
  approveListing: (listingId: string) => void;
  rejectListing: (listingId: string, reason: string) => void;
  activateListing: (listingId: string) => void;
  deactivateListing: (listingId: string) => void;
  adminDeleteListing: (listingId: string) => void;
  saveBanner: (banner: Banner) => void;
  deleteBanner: (bannerId: string) => void;
  toggleBanner: (bannerId: string) => void;
};

const ClassifiedsContext = createContext<ClassifiedsContextValue | null>(null);

function nowIso() {
  return new Date().toISOString();
}

function resolveListingDeadlineDate(listing: Pick<CargoListing, "pickupDeadlineDate" | "createdAt" | "durationDays">) {
  return (
    normalizePickupDeadlineDateValue(listing.pickupDeadlineDate) ||
    derivePickupDeadlineFromLegacyDuration(listing.createdAt, listing.durationDays)
  );
}

function resolveListingExpiresAt(listing: Pick<CargoListing, "pickupDeadlineDate" | "createdAt" | "durationDays">) {
  const pickupDeadlineDate = resolveListingDeadlineDate(listing);

  return pickupDeadlineDate
    ? calculateExpiresAtFromPickupDeadline(pickupDeadlineDate).toISOString()
    : null;
}

export function ClassifiedsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [owners, setOwnersState] = useState<CargoOwner[]>([]);
  const [listings, setListingsState] = useState<CargoListing[]>([]);
  const [banners, setBannersState] = useState<Banner[]>([]);

  const hydrate = useCallback(() => {
    setOwnersState(getStoredOwners());
    setListingsState(getStoredListings());
    setBannersState(getStoredBanners());
    setReady(true);
  }, []);

  useEffect(() => {
    hydrate();
    const onStorage = () => hydrate();
    window.addEventListener("storage", onStorage);
    window.addEventListener(classifiedsStorageEvent, onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(classifiedsStorageEvent, onStorage);
    };
  }, [hydrate]);

  const saveListing = useCallback(
    (draft: CargoListingDraft, ownerContext: OwnerContext, listingId?: string | null) => {
      const currentItems = getStoredListings();
      const existing = listingId ? currentItems.find((item) => item.id === listingId) : undefined;
      const normalizedQuantity = normalizeQuantityValue(draft.quantity);
      const volume = calculateVolumeFromDimensions(draft.length, draft.width, draft.height);
      const payload: CargoListing = {
        id: existing?.id || `load-${Date.now()}`,
        ownerId: ownerContext.id,
        ownerName: ownerContext.name,
        ownerPhone: ownerContext.phone,
        title: draft.title,
        cargoType: draft.cargoType,
        description: draft.description,
        weight: Number(draft.weight),
        volume: volume ?? undefined,
        length: draft.length || "",
        width: draft.width || "",
        height: draft.height || "",
        quantity: normalizedQuantity || "",
        pickupCity: draft.pickupCity,
        pickupAddress: draft.pickupAddress,
        deliveryCity: draft.deliveryCity,
        deliveryAddress: draft.deliveryAddress,
        pickupDate: draft.pickupDate || "",
        pickupDeadlineDate: normalizePickupDeadlineDateValue(draft.pickupDeadlineDate),
        pickupTime: draft.pickupTime || "",
        vehicleType: draft.vehicleType || "",
        price: draft.price || "",
        note: draft.note || "",
        needsLoadingHelp: draft.needsLoadingHelp || "Xeyr",
        needsUnloadingHelp: draft.needsUnloadingHelp || "Xeyr",
        requiresInvoice: draft.requiresInvoice || "Xeyr",
        roundTrip: draft.roundTrip || "Xeyr",
        durationDays: existing?.durationDays,
        createdAt: existing?.createdAt || nowIso(),
        approvedAt: null,
        expiresAt: null,
        deactivatedAt: null,
        rejectionReason: null,
        status: "PENDING",
        photo: draft.photo,
        photos: draft.photos || (draft.photo ? [draft.photo] : [])
      };

      const nextItems = existing
        ? currentItems.map((item) => (item.id === existing.id ? payload : item))
        : [payload, ...currentItems];

      setStoredListings(nextItems);
      hydrate();
      return payload;
    },
    [hydrate]
  );

  const restoreListing = useCallback(
    (listingId: string) => {
      const nextItems = getStoredListings().map((item) =>
        item.id === listingId
          ? {
              ...item,
              status: "PENDING" as const,
              approvedAt: null,
              expiresAt: null,
              deactivatedAt: null,
              rejectionReason: null
            }
          : item
      );

      setStoredListings(nextItems);
      hydrate();
    },
    [hydrate]
  );

  const softDeleteListing = useCallback(
    (listingId: string) => {
      const nextItems = getStoredListings().filter((item) => item.id !== listingId);
      setStoredListings(nextItems);
      hydrate();
    },
    [hydrate]
  );

  const setOwnerStatus = useCallback(
    (ownerId: string, status: CargoOwner["status"]) => {
      const nextOwners = getStoredOwners().map((owner) =>
        owner.id === ownerId ? { ...owner, status } : owner
      );
      setStoredOwners(nextOwners);
      hydrate();
    },
    [hydrate]
  );

  const approveListing = useCallback(
    (listingId: string) => {
      const approvedAt = nowIso();
      const nextItems = getStoredListings().map((item) =>
        item.id === listingId
          ? {
              ...item,
              status: "ACTIVE" as const,
              approvedAt,
              expiresAt: resolveListingExpiresAt(item),
              deactivatedAt: null,
              rejectionReason: null
            }
          : item
      );
      setStoredListings(nextItems);
      hydrate();
    },
    [hydrate]
  );

  const rejectListing = useCallback(
    (listingId: string, reason: string) => {
      const nextItems = getStoredListings().map((item) =>
        item.id === listingId
          ? {
              ...item,
              status: "REJECTED" as const,
              rejectionReason: reason.trim(),
              approvedAt: null,
              expiresAt: null,
              deactivatedAt: null
            }
          : item
      );
      setStoredListings(nextItems);
      hydrate();
    },
    [hydrate]
  );

  const activateListing = useCallback(
    (listingId: string) => {
      const nextItems = getStoredListings().map((item) => {
        if (item.id !== listingId) return item;
        const approvedAt = item.approvedAt || nowIso();
        return {
          ...item,
          status: "ACTIVE" as const,
          approvedAt,
          expiresAt: resolveListingExpiresAt(item),
          deactivatedAt: null,
          rejectionReason: null
        };
      });
      setStoredListings(nextItems);
      hydrate();
    },
    [hydrate]
  );

  const deactivateListing = useCallback(
    (listingId: string) => {
      const nextItems = getStoredListings().map((item) =>
        item.id === listingId
          ? {
              ...item,
              status: "INACTIVE" as const,
              deactivatedAt: nowIso()
            }
          : item
      );
      setStoredListings(nextItems);
      hydrate();
    },
    [hydrate]
  );

  const adminDeleteListing = useCallback(
    (listingId: string) => {
      const nextItems = getStoredListings().filter((item) => item.id !== listingId);
      setStoredListings(nextItems);
      hydrate();
    },
    [hydrate]
  );

  const saveBanner = useCallback(
    (banner: Banner) => {
      const currentItems = getStoredBanners();
      const nextItems = currentItems.some((item) => item.id === banner.id)
        ? currentItems.map((item) => (item.id === banner.id ? banner : item))
        : [...currentItems, banner];
      setStoredBanners(nextItems);
      hydrate();
    },
    [hydrate]
  );

  const deleteBanner = useCallback(
    (bannerId: string) => {
      setStoredBanners(getStoredBanners().filter((banner) => banner.id !== bannerId));
      hydrate();
    },
    [hydrate]
  );

  const toggleBanner = useCallback(
    (bannerId: string) => {
      const nextItems = getStoredBanners().map((banner) =>
        banner.id === bannerId ? { ...banner, isActive: !banner.isActive } : banner
      );
      setStoredBanners(nextItems);
      hydrate();
    },
    [hydrate]
  );

  const value = useMemo<ClassifiedsContextValue>(
    () => ({
      ready,
      owners,
      listings,
      banners,
      hydrate,
      saveListing,
      restoreListing,
      softDeleteListing,
      setOwnerStatus,
      approveListing,
      rejectListing,
      activateListing,
      deactivateListing,
      adminDeleteListing,
      saveBanner,
      deleteBanner,
      toggleBanner
    }),
    [
      ready,
      owners,
      listings,
      banners,
      hydrate,
      saveListing,
      restoreListing,
      softDeleteListing,
      setOwnerStatus,
      approveListing,
      rejectListing,
      activateListing,
      deactivateListing,
      adminDeleteListing,
      saveBanner,
      deleteBanner,
      toggleBanner
    ]
  );

  return <ClassifiedsContext.Provider value={value}>{children}</ClassifiedsContext.Provider>;
}

export function useClassifieds() {
  const context = useContext(ClassifiedsContext);

  if (!context) {
    throw new Error("useClassifieds must be used inside ClassifiedsProvider.");
  }

  return context;
}

export { classifiedsKeys };