import { Suspense } from "react";
import { LoadsPageClient } from "@/components/classifieds/LoadsPageClient";
import { getPublicListingsFromPostgres } from "@/lib/public-listings";
import type { CargoListing } from "@/types/classifieds";
import Loading from "@/app/loading";

export const dynamic = "force-dynamic";

export default async function LoadsPage() {
  let initialListings: CargoListing[] = [];

  try {
    initialListings = await getPublicListingsFromPostgres();
  } catch (error) {
    console.error("Loads SSR listings error:", error);
  }

  return (
    <Suspense fallback={<Loading />}>
      <LoadsPageClient initialListings={initialListings} />
    </Suspense>
  );
}
