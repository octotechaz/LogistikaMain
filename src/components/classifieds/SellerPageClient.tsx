"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, MapPin, RotateCcw, Search, SlidersHorizontal, User } from "lucide-react";

import { applyListingFilters, createEmptyFilters, formatWeight } from "@/lib/classifieds-format";
import { useLocale } from "@/hooks/useLocale";
import { classifiedsCargoTypes, classifiedsCities, classifiedsVehicleTypes } from "@/lib/classifieds-meta";
import { ListingCoverMedia } from "@/components/classifieds/ListingCoverMedia";
import type { CargoListing, ListingFilters } from "@/types/classifieds";

type SellerInfo = {
  owner: { id: string; name: string; createdAt: string };
  listings: CargoListing[];
};

type SortMode = "newest" | "price-asc" | "price-desc" | "weight-desc";

function formatPrice(price?: string | number | null) {
  if (!price) return null;
  const n = parseFloat(String(price));
  if (!Number.isFinite(n)) return null;
  return `${n.toLocaleString("az-AZ")} ₼`;
}

function sortListings(list: CargoListing[], mode: SortMode): CargoListing[] {
  const copy = [...list];
  if (mode === "newest") return copy.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  if (mode === "price-asc") return copy.sort((a, b) => parseFloat(String(a.price || "0")) - parseFloat(String(b.price || "0")));
  if (mode === "price-desc") return copy.sort((a, b) => parseFloat(String(b.price || "0")) - parseFloat(String(a.price || "0")));
  if (mode === "weight-desc") return copy.sort((a, b) => (b.weight || 0) - (a.weight || 0));
  return copy;
}

function SellerCard({ listing }: { listing: CargoListing }) {
  const { locale } = useLocale();
  const localizedTitle = (locale !== "az" && (listing.translations as Record<string, { title?: string }>)?.[locale]?.title) || listing.title;
  const price = formatPrice(listing.price);

  return (
    <Link
      href={`/loads/${listing.id}`}
      className="group overflow-hidden rounded-[20px] border border-slate-200/90 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.10)]"
    >
      <div className="relative aspect-[1/0.82] bg-[#f5f7fb]">
        <ListingCoverMedia
          listing={listing}
          imageClassName="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          placeholderClassName="h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/10 via-transparent to-transparent" />
      </div>
      <div className="px-4 pb-4 pt-3">
        {price && (
          <p className="text-[16px] font-bold leading-none text-logistics-orange">{price}</p>
        )}
        <h3 className="mt-1.5 line-clamp-2 min-h-[2.4em] text-[15px] font-semibold leading-snug text-navy-900">{localizedTitle}</h3>
        <p className="mt-0.5 text-[12px] font-medium text-slate-400">{listing.cargoType}</p>
        <div className="mt-2 space-y-1 text-[12px] text-slate-500">
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
            {listing.pickupCity} → {listing.deliveryCity}
          </p>
          {listing.pickupDate && (
            <p className="flex items-center gap-1.5">
              <Clock3 className="h-3 w-3 shrink-0 text-slate-400" />
              {listing.pickupDate}
            </p>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3 border-t border-slate-100 pt-2 text-[11.5px] text-slate-500">
          <span>{formatWeight(listing.weight)}</span>
          {listing.vehicleType && <span>· {listing.vehicleType}</span>}
        </div>
      </div>
    </Link>
  );
}

export function SellerPageClient({ sellerId }: { sellerId: string }) {
  const { t } = useLocale();
  const [data, setData] = useState<SellerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<ListingFilters>(createEmptyFilters());
  const [draft, setDraft] = useState<ListingFilters>(createEmptyFilters());
  const [sortBy, setSortBy] = useState<SortMode>("newest");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetch(`/api/public/seller/${sellerId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json?.data) setData(json.data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [sellerId]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return sortListings(applyListingFilters(data.listings, filters), sortBy);
  }, [data, filters, sortBy]);

  function updateDraft(key: keyof ListingFilters, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function submitFilters() {
    setFilters(draft);
  }

  function clearFilters() {
    const empty = createEmptyFilters();
    setFilters(empty);
    setDraft(empty);
    setShowAdvanced(false);
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-logistics-orange border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-slate-500">{t("seller_not_found", "İstifadəçi tapılmadı.")}</p>
      </div>
    );
  }

  const { owner } = data;
  const memberSince = new Date(owner.createdAt).getFullYear();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/loads" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" />
        {t("back_to_listings", "Elanlara qayıt")}
      </Link>

      <div className="mb-8 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-logistics-orange/10 text-2xl font-bold text-logistics-orange">
            {owner.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy-900">{owner.name}</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
              <User className="h-3.5 w-3.5" />
              {memberSince}{t("member_since_suffix", "-ci ildən üzv")}
            </p>
          </div>
          <div className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {data.listings.length} {t("seller_listing_count_label", "elan")}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={draft.pickupCity}
            onChange={(e) => updateDraft("pickupCity", e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
          >
            <option value="">{t("filter_pickup_city", "Yükləmə şəhəri")}</option>
            {classifiedsCities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={draft.deliveryCity}
            onChange={(e) => updateDraft("deliveryCity", e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
          >
            <option value="">{t("filter_delivery_city", "Boşaltma şəhəri")}</option>
            {classifiedsCities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={draft.cargoType}
            onChange={(e) => updateDraft("cargoType", e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
          >
            <option value="">{t("filter_cargo_type", "Yük növü")}</option>
            {classifiedsCargoTypes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={draft.vehicleType}
            onChange={(e) => updateDraft("vehicleType", e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
          >
            <option value="">{t("filter_vehicle_type", "Nəqliyyat növü")}</option>
            {classifiedsVehicleTypes.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t("filter_advanced", "Ətraflı filter")}
          </button>
          <button
            type="button"
            onClick={submitFilters}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Search className="h-4 w-4" />
            {t("filter_search", "Axtar")}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("filter_clear", "Sıfırla")}
            </button>
          )}
          <div className="ml-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortMode)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
            >
              <option value="newest">{t("sort_newest", "Ən yeni")}</option>
              <option value="price-asc">{t("sort_price_asc", "Qiymət: aşağıdan yuxarı")}</option>
              <option value="price-desc">{t("sort_price_desc", "Qiymət: yuxarıdan aşağı")}</option>
              <option value="weight-desc">{t("sort_weight_desc", "Çəki: çoxdan aza")}</option>
            </select>
          </div>
        </div>

        {showAdvanced && (
          <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <input type="number" placeholder={t("filter_min_price", "Min qiymət (₼)")} value={draft.minPrice}
              onChange={(e) => updateDraft("minPrice", e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none" />
            <input type="number" placeholder={t("filter_max_price", "Max qiymət (₼)")} value={draft.maxPrice}
              onChange={(e) => updateDraft("maxPrice", e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none" />
            <input type="number" placeholder={t("filter_min_weight", "Min çəki (t)")} value={draft.minWeight}
              onChange={(e) => updateDraft("minWeight", e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none" />
            <input type="number" placeholder={t("filter_max_weight", "Max çəki (t)")} value={draft.maxWeight}
              onChange={(e) => updateDraft("maxWeight", e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none" />
            <input type="date" placeholder={t("filter_date_from", "Tarixdən")} value={draft.dateFrom}
              onChange={(e) => updateDraft("dateFrom", e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none" />
            <input type="date" placeholder={t("filter_date_to", "Tarixə qədər")} value={draft.dateTo}
              onChange={(e) => updateDraft("dateTo", e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none" />
            <input type="text" placeholder={t("filter_keyword", "Açar söz")} value={draft.keyword}
              onChange={(e) => updateDraft("keyword", e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700">
          {filtered.length} {t("seller_results_count", "nəticə")}
        </h2>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400">
          {t("seller_no_listings", "Heç bir elan tapılmadı.")}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((listing) => (
            <SellerCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </main>
  );
}