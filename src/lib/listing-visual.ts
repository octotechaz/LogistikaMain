import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  Building2,
  Droplets,
  Package2,
  Snowflake,
  Truck,
  Wheat,
} from "lucide-react";

import type { CargoListing } from "@/types/classifieds";

export type ListingVisualTone = {
  icon: LucideIcon;
  panel: string;
};

export function hasListingPhoto(listing: CargoListing) {
  return Boolean(listing.photos?.[0] || listing.photo);
}

export function getListingPhotoUrl(listing: CargoListing) {
  return listing.photos?.[0] || listing.photo || null;
}

export function listingVisualTone(listing: CargoListing): ListingVisualTone {
  const value = `${listing.title} ${listing.cargoType} ${listing.description}`.toLocaleLowerCase("az");

  if (value.includes("mebel") || value.includes("ev əşya")) {
    return { icon: Package2, panel: "bg-amber-50 text-amber-700" };
  }

  if (value.includes("tikinti")) {
    return { icon: Building2, panel: "bg-amber-50 text-amber-700" };
  }

  if (value.includes("palet")) {
    return { icon: Boxes, panel: "bg-indigo-50 text-indigo-700" };
  }

  if (value.includes("ərzaq") || value.includes("qida")) {
    return { icon: Package2, panel: "bg-blue-50 text-blue-700" };
  }

  if (value.includes("taxıl") || value.includes("kənd")) {
    return { icon: Wheat, panel: "bg-emerald-50 text-emerald-700" };
  }

  if (value.includes("soyud") || value.includes("refrijerator")) {
    return { icon: Snowflake, panel: "bg-sky-50 text-sky-700" };
  }

  if (value.includes("maye")) {
    return { icon: Droplets, panel: "bg-orange-50 text-orange-700" };
  }

  if (value.includes("nəqliyyat") || value.includes("avtomobil") || value.includes("maşın")) {
    return { icon: Truck, panel: "bg-slate-100 text-slate-600" };
  }

  return { icon: Boxes, panel: "bg-slate-100 text-slate-600" };
}
