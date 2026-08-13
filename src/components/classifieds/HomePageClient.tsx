"use client";

import { CatalogPageClient } from "@/components/classifieds/CatalogPageClient";
import type { CargoListing } from "@/types/classifieds";

export function HomePageClient({ initialListings = [] }: { initialListings?: CargoListing[] }) {
  return <CatalogPageClient mode="home" initialListings={initialListings} />;
}
