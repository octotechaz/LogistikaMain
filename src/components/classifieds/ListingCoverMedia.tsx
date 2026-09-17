"use client";

import { cn } from "@/lib/utils";
import {
  getListingPhotoUrl,
  listingVisualTone,
} from "@/lib/listing-visual";
import type { CargoListing } from "@/types/classifieds";

export function ListingCoverMedia({
  listing,
  imageClassName,
  placeholderClassName = "h-full w-full",
  placeholderIconClassName = "h-16 w-16",
}: {
  listing: CargoListing;
  imageClassName?: string;
  placeholderClassName?: string;
  placeholderIconClassName?: string;
}) {
  const photo = getListingPhotoUrl(listing);

  if (photo) {
    return (
      <img
        src={photo}
        alt={listing.title}
        className={imageClassName}
      />
    );
  }

  const tone = listingVisualTone(listing);
  const Icon = tone.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        tone.panel,
        placeholderClassName
      )}
      aria-hidden
    >
      <Icon className={placeholderIconClassName} />
    </div>
  );
}
