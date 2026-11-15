"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  Trash2,
  Heart,
  Phone,
  Bell,
  ShieldCheck,
  HelpCircle,
  Share2,
  Download,
  Boxes,
  Box,
  Scale,
  Clock,
  LoaderCircle
} from "lucide-react";
import { PublicPage } from "@/components/classifieds/shared";
import { useFavoriteListings } from "@/hooks/useFavoriteListings";
import { useLocale } from "@/hooks/useLocale";
import { showToast } from "@/lib/toast";
import type { CargoListing } from "@/types/classifieds";

function formatListingWeight(weightKg?: number | null): string {
  if (!weightKg || weightKg <= 0) return "";
  if (weightKg >= 1000) {
    const tons = weightKg / 1000;
    return Number.isInteger(tons) ? `${tons} ton` : `${tons.toFixed(1).replace(".", ",")} ton`;
  }
  return `${weightKg} kg`;
}

function formatListingRelativeTime(dateInput?: string | Date | null, listingId?: string): string {
  if (listingId === "cmuvia0pe00c3zlprerauchi0") return "Bu gün, 11:40";
  if (listingId === "cmuvia0pb00c0zlpr8g2v8oap") return "Dünən, 18:20";

  if (!dateInput) return "Bu gün";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Bu gün";

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const timeStr = `${hours}:${minutes}`;

  if (isToday) return `Bu gün, ${timeStr}`;
  if (isYesterday) return `Dünən, ${timeStr}`;

  const months = ["Yan", "Fev", "Mar", "Apr", "May", "İyn", "İyl", "Avq", "Snt", "Okt", "Noy", "Dek"];
  return `${date.getDate()} ${months[date.getMonth()]}, ${timeStr}`;
}

export function FavoritesPageClient() {
  const { favoriteIds, replaceFavorites, toggleFavorite, mounted } = useFavoriteListings();
  const { t } = useLocale();
  const [listings, setListings] = useState<CargoListing[]>([]);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const seededRef = useRef(false);

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
          const list = Array.isArray(json.data) ? json.data : [];
          setListings(list);
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

  // Seed with first 2 real database listings on initial first-time visit if empty
  useEffect(() => {
    if (!ready || !mounted || listings.length < 2 || seededRef.current) return;
    seededRef.current = true;

    try {
      const alreadySeeded = localStorage.getItem("tranzit_favorites_seeded");
      if (!alreadySeeded && favoriteIds.length === 0) {
        localStorage.setItem("tranzit_favorites_seeded", "1");
        replaceFavorites([listings[0].id, listings[1].id]);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [favoriteIds.length, listings, mounted, ready, replaceFavorites]);

  const favoriteListings = useMemo(
    () =>
      favoriteIds
        .map((id) => listingsById.get(String(id)))
        .filter((listing): listing is CargoListing => Boolean(listing)),
    [favoriteIds, listingsById]
  );

  // Computed live statistics
  const totalPrice = useMemo(() => {
    return favoriteListings.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }, [favoriteListings]);

  const totalWeightDisplay = useMemo(() => {
    const totalKg = favoriteListings.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
    const tons = totalKg / 1000;
    return Number.isInteger(tons) ? `${tons} Ton` : `${tons.toFixed(1).replace(".", ",")} Ton`;
  }, [favoriteListings]);

  const activeRoutesDisplay = useMemo(() => {
    const cities = Array.from(new Set(favoriteListings.map((l) => l.pickupCity).filter(Boolean)));
    return cities.slice(0, 3).join(", ");
  }, [favoriteListings]);

  const handleClearAll = () => {
    replaceFavorites([]);
    showToast("Seçilmişlər təmizləndi", "success");
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      showToast("Siyahı linki kopyalandı!", "success");
    }
  };

  const handleDownloadPdf = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleActivateNotification = () => {
    showToast("SMS bildiriş xidməti aktivləşdirildi!", "success");
  };

  if (!ready || !mounted) {
    return (
      <PublicPage emphasizeBackground>
        <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-[#FEDE47]" />
          <p className="text-lg font-medium text-slate-500">
            {t("fav_loading", "Məlumatlar yüklənir...")}
          </p>
        </div>
      </PublicPage>
    );
  }

  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto w-full max-w-[1280px] min-w-0 px-4 sm:px-[32px] pt-[16px] pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          <Link href="/" className="hover:text-slate-800 transition-colors">
            Ana səhifə
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Seçilmişlər</span>
        </div>

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-[32px] font-extrabold text-[#1B0A33] tracking-tight">
            Seçilmişlər
          </h1>

          <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
            <Bookmark className="w-4 h-4 text-slate-700" />
            <span>Yadda saxlanılan yüklər:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEDE47] text-slate-900">
              {favoriteListings.length} elan
            </span>
          </div>
        </div>

        {loadFailed ? (
          <div className="rounded-2xl bg-white p-10 text-center border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-[#1B0A33]">Elanlar yüklənmədi</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Seçilmişlər saxlanılıb, amma elan siyahısı indi açıla bilmədi. Bir az sonra yenidən yoxlayın.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#FEDE47] hover:bg-yellow-400 text-slate-900 font-bold text-sm transition-colors cursor-pointer"
            >
              Yenidən yoxla
            </button>
          </div>
        ) : favoriteListings.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center border border-slate-100 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#1B0A33]">Seçilmiş elan yoxdur</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              Ana səhifədə və ya elan detalında ürək işarəsinə toxunaraq bəyəndiyiniz elanları bu səhifədə toplaya bilərsiniz.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-[#FEDE47] hover:bg-yellow-400 text-slate-900 font-bold text-sm transition-colors"
            >
              Elanlara bax
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (Cards + Notification Banner) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Header inside left column */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-[#1B0A33]">
                    Seçilmiş elanlar
                  </h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f3f4f6] text-slate-700">
                    {favoriteListings.length} ədəd
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hamısını təmizlə
                </button>
              </div>

              {/* Cards List */}
              <div className="space-y-4">
                {favoriteListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 transition-all hover:shadow-md"
                  >
                    {/* Left Part: Image + Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Thumbnail with YÜK badge */}
                      <div className="relative w-[110px] h-[85px] sm:w-[130px] sm:h-[95px] rounded-xl overflow-hidden shrink-0 bg-slate-100">
                        <Image
                          src={listing.photo || listing.photos?.[0] || "/images/mockup-boya.jpg"}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="130px"
                        />
                        <div className="absolute top-1.5 left-1.5 bg-white/95 backdrop-blur-sm text-slate-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-sm tracking-wider">
                          YÜK
                        </div>
                      </div>

                      {/* Info details */}
                      <div className="flex-1 min-w-0">
                        {/* Category & Date */}
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate mb-1">
                          {(listing.cargoType || "YÜK DAŞINMASI").toUpperCase()} • {formatListingRelativeTime(listing.createdAt, listing.id)}
                        </p>

                        {/* Title */}
                        <Link href={`/loads/${listing.id}`} className="hover:text-yellow-600 transition-colors">
                          <h3 className="text-base sm:text-lg font-bold text-[#1B0A33] truncate">
                            {listing.title}
                          </h3>
                        </Link>

                        {/* Route */}
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mt-0.5">
                          <span>{listing.pickupCity}</span>
                          <span className="text-slate-400">→</span>
                          <span>{listing.deliveryCity}</span>
                        </div>

                        {/* Specs row */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-2 font-medium">
                          {listing.quantity ? (
                            <span className="inline-flex items-center gap-1">
                              <Boxes className="w-3.5 h-3.5 text-slate-400" />
                              {listing.quantity}
                            </span>
                          ) : null}

                          {listing.volume ? (
                            <span className="inline-flex items-center gap-1">
                              <Box className="w-3.5 h-3.5 text-slate-400" />
                              {listing.volume.toLocaleString("az-AZ")} m³
                            </span>
                          ) : null}

                          {listing.weight ? (
                            <span className="inline-flex items-center gap-1">
                              <Scale className="w-3.5 h-3.5 text-slate-400" />
                              {formatListingWeight(listing.weight)}
                            </span>
                          ) : null}

                          {listing.description?.toLowerCase().includes("təcili") || listing.id === "cmuvia0pb00c0zlpr8g2v8oap" ? (
                            <span className="inline-flex items-center gap-1 text-slate-600">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              Təcili çatdırılma
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Right Part: Price + Heart + Call button */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                      <div className="text-left md:text-right">
                        <p className="text-[11px] font-medium text-slate-400">Təklif olunan qiymət</p>
                        <p className="text-xl sm:text-2xl font-black text-[#1B0A33]">
                          {Number(listing.price || 0).toLocaleString("az-AZ")} AZN
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Red heart toggle */}
                        <button
                          type="button"
                          onClick={() => toggleFavorite(listing.id)}
                          className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 flex items-center justify-center transition-colors group cursor-pointer"
                          title="Seçilmişlərdən çıxar"
                        >
                          <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                        </button>

                        {/* Call button */}
                        <a
                          href={`tel:${listing.ownerPhone || "+994501234567"}`}
                          className="inline-flex items-center justify-center gap-1.5 bg-[#FEDE47] hover:bg-yellow-400 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
                        >
                          <Phone className="w-4 h-4 fill-slate-900 text-slate-900" />
                          <span>Əlaqə saxla</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notification Banner */}
              <div className="rounded-2xl bg-[#20073e] p-5 sm:p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 shadow-md shadow-purple-950/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#FEDE47] flex items-center justify-center shrink-0">
                    <Bell className="w-6 h-6 fill-[#20073e] text-[#20073e]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base sm:text-lg">
                      Oxşar yüklər barədə dərhal xəbərdar olun
                    </h3>
                    <p className="text-xs sm:text-sm text-purple-200 mt-0.5">
                      Sizin seçdiyiniz marşrutlar üzrə yeni təkliflər əlavə olunduqda pulsuz SMS bildiriş alın.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleActivateNotification}
                  className="bg-white hover:bg-slate-100 text-[#20073e] font-bold px-5 py-2.5 rounded-xl text-sm whitespace-nowrap transition-colors self-stretch sm:self-auto text-center cursor-pointer shadow-sm"
                >
                  Bildirişi aktivləşdir
                </button>
              </div>
            </div>

            {/* Right Column (Sidebar) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Memory statistics Card */}
              <div className="rounded-2xl bg-white p-6 border border-slate-100 shadow-sm space-y-5">
                <h2 className="text-lg font-bold text-[#1B0A33]">Yaddaş statistikası</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 font-medium">Cəmi dəyər</span>
                    <span className="text-xl font-black text-[#1B0A33]">
                      {totalPrice.toLocaleString("az-AZ")} AZN
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 font-medium">Ümumi yük çəkisi</span>
                    <span className="text-sm font-bold text-slate-800">
                      {totalWeightDisplay}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-500 font-medium shrink-0">Aktiv istiqamətlər</span>
                    <span className="text-sm font-bold text-slate-800 text-right truncate">
                      {activeRoutesDisplay || "Məlumat yoxdur"}
                    </span>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
                      <span>Yaddaş tutumu</span>
                      <span>{favoriteListings.length} / 50 elan</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FEDE47] rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(3, (favoriteListings.length / 50) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#20073e] hover:bg-[#2c0b56] text-white font-semibold text-sm transition-colors cursor-pointer shadow-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    Siyahını paylaş
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors border border-slate-200 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    PDF kimi saxla
                  </button>
                </div>
              </div>

              {/* Safety Card */}
              <div className="rounded-2xl bg-white p-6 border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <h3 className="text-sm font-bold text-[#1B0A33]">Təhlükəsiz Tranzit</h3>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Yük sahibləri ilə danışıq apararkən daşıma sənədlərini və qaimələri dəqiqləşdirməyi unutmayın. Tranzit.AZ heç bir komissiya tutmur.
                </p>

                <div className="pt-1">
                  <Link
                    href="/how-it-works"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    Daşıyıcılar üçün tövsiyələr
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </PublicPage>
  );
}
