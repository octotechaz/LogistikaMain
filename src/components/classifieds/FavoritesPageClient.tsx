"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Heart, LoaderCircle } from "lucide-react";
import { EmptyAccessState, ListingSummaryCard, PageSection, PublicPage } from "@/components/classifieds/shared";
import { FavoriteToggleButton } from "@/components/classifieds/FavoriteToggleButton";
import { ButtonLink } from "@/components/ui/Button";
import { useFavoriteListings } from "@/hooks/useFavoriteListings";
import type { CargoListing } from "@/types/classifieds";

export function FavoritesPageClient() {
  const { favoriteIds, replaceFavorites, mounted } = useFavoriteListings();
  const [listings, setListings] = useState<CargoListing[]>([]);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/public/listings", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to load listings");
        }
        const json = (await res.json()) as { data?: CargoListing[] };
        if (!cancelled) {
          setListings(Array.isArray(json.data) ? json.data : []);
          setLoadFailed(false);
        }
      } catch (err) {
        console.error("Failed to load listings:", err);
        if (!cancelled) {
          setListings([]);
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const listingsById = useMemo(() => {
    const map = new Map<string, CargoListing>();
    for (const listing of listings) {
      map.set(String(listing.id), listing);
    }
    return map;
  }, [listings]);

  const favoriteListings = useMemo(
    () =>
      favoriteIds
        .map((id) => listingsById.get(String(id)))
        .filter((listing): listing is CargoListing => Boolean(listing)),
    [favoriteIds, listingsById]
  );

  useEffect(() => {
    // Only prune missing IDs after a successful listings fetch.
    // Never wipe favorites when the API fails or returns before hydrate.
    if (!ready || !mounted || loadFailed || listings.length === 0) {
      return;
    }

    const validIds = favoriteIds.filter((id) => listingsById.has(String(id)));
    if (validIds.length !== favoriteIds.length) {
      replaceFavorites(validIds);
    }
  }, [favoriteIds, listings, listingsById, loadFailed, mounted, ready, replaceFavorites]);

  if (!ready || !mounted) {
    return (
      <PublicPage emphasizeBackground>
        <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-logistics-orange" />
          <p className="text-lg font-medium text-slate-500">Məlumatlar yüklənir...</p>
        </div>
      </PublicPage>
    );
  }

  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <PageSection
          title="Bəyəndiyiniz elanlar"
          description="İstifadəçi hesabı olmadan da ürək işarəsi ilə elanları buraya əlavə edib sonra rahat baxa bilərsiniz."
          action={
            <ButtonLink href="/" variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Ana səhifəyə qayıt
            </ButtonLink>
          }
        />

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-soft">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-logistics-orange">
            <Heart className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy-900">{favoriteIds.length} elan saxlanılıb</p>
            <p className="text-sm text-slate-500">Kartlardakı ürəyə yenidən toxunaraq siyahıdan çıxara bilərsiniz.</p>
          </div>
        </div>

        {loadFailed ? (
          <div className="mt-6">
            <EmptyAccessState
              title="Elanlar yüklənmədi"
              description="Seçilmişlər saxlanılıb, amma elan siyahısı indi açıla bilmədi. Bir az sonra yenidən yoxlayın."
              actionHref="/favorites"
              actionLabel="Yenidən yoxla"
            />
          </div>
        ) : favoriteListings.length ? (
          <div className="mt-6 space-y-4">
            {favoriteListings.map((listing) => (
              <div key={listing.id} className="group">
                <ListingSummaryCard
                  listing={listing}
                  hideStatus={true}
                  actionNode={
                    <FavoriteToggleButton
                      listingId={String(listing.id)}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-red-50 text-red-500 transition duration-200 hover:bg-red-100 hover:text-red-600 border border-red-100"
                      iconClassName="h-4 w-4 fill-current"
                    />
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <EmptyAccessState
              title="Seçilmiş elan yoxdur"
              description="Ana səhifədə və ya elan detalında ürək işarəsinə toxunaraq bəyəndiyiniz elanları bu səhifədə toplaya bilərsiniz."
              actionHref="/"
              actionLabel="Elanlara bax"
            />
          </div>
        )}
      </section>
    </PublicPage>
  );
}
