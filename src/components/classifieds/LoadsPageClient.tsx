"use client";

import { CatalogPageClient } from "@/components/classifieds/CatalogPageClient";

import type { CargoListing } from "@/types/classifieds";

export function LoadsPageClient({ initialListings = [] }: { initialListings?: CargoListing[] }) {
  return <CatalogPageClient mode="loads" initialListings={initialListings} />;
}
