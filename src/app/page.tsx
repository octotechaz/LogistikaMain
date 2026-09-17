import { Suspense } from "react";
import { HomePageClient } from "@/components/classifieds/HomePageClient";
import { getPublicListingsFromPostgres } from "@/lib/public-listings";
import type { CargoListing } from "@/types/classifieds";
import Loading from "./loading";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initialListings: CargoListing[] = [];

  try {
    initialListings = await getPublicListingsFromPostgres();
  } catch (error) {
    console.error("Homepage SSR listings error:", error);
  }

  return (
    <Suspense fallback={<Loading />}>
      <HomePageClient initialListings={initialListings} />
    </Suspense>
  );
}
