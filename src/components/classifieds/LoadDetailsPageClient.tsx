"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Eye,
  Flag,
  MapPin,
  MessageCircleMore,
  Package2,
  Phone,
  PhoneCall,
  Printer,
  Scale,
  Share2,
  ShieldCheck,
  Truck
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { listingVisualTone } from "@/lib/listing-visual";
import { FavoriteToggleButton } from "@/components/classifieds/FavoriteToggleButton";
import { PublicPage } from "@/components/classifieds/shared";
import { useApiAuthUser } from "@/hooks/useApiAuthUser";

// Dynamically import Map component to avoid SSR issues with Leaflet
const RouteMap = dynamic(() => import("@/components/Map/RouteMap"), { ssr: false });
import {
  FacebookShareButton,
  FacebookIcon,
  TwitterShareButton,
  XIcon,
  WhatsappShareButton,
  WhatsappIcon,
  TelegramShareButton,
  TelegramIcon,
  LinkedinShareButton,
  LinkedinIcon
} from "react-share";
import { LoaderCircle } from "lucide-react";
import {
  formatDimensions,
  formatQuantity,
  formatVolume,
  resolveVolumeValue
} from "@/lib/cargo-measurements";
import {
  formatDateNumeric,
  formatListingDate,
  formatWeightKg
} from "@/lib/classifieds-format";
import { effectiveStatus } from "@/lib/status/classifieds";
import { cn } from "@/lib/utils";
import type { CargoListing } from "@/types/classifieds";
import { useLocale } from "@/hooks/useLocale";
import { ContactBottomSheet } from "@/components/classifieds/ContactBottomSheet";

function numericIdFromListingId(id: string) {
  // Eğer id direkt sqlite ID'si ise (örn: '1', '2' gibi sayılar) başa 56 koyup 6 haneli yapalım
  const digits = id.replace(/\D/g, "");
  return digits ? `56${digits.padStart(4, "0")}` : "5697826";
}

function listingImages(primary?: string, photos: string[] = []) {
  // Sadece eklenen resimleri göster, örnek resimleri kaldır
  const gallery = [
    ...photos,
    primary || ""
  ].filter((item) => item.trim() !== "");

  // Eğer hiç resim yoksa, boş dizi dönsün (ya da 1 tane logo vs gösterebilirsin)
  return Array.from(new Set(gallery));
}

function DetailInfoRow({
  label,
  value
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-navy-900">{value}</span>
    </div>
  );
}

function DetailFactItem({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[22px,1fr] gap-3">
      <div className="pt-0.5 text-slate-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-[1rem] font-semibold text-navy-900">{value}</p>
      </div>
    </div>
  );
}

type VehicleOption = { id: string; plateNumber: string; vehicleType: string; brand: string; model: string };

export function LoadDetailsPageClient({ id }: { id: string }) {
  const { t, locale } = useLocale();
  const { user: currentApiUser, legacyUser } = useApiAuthUser();
  const isAuthorized = !!(currentApiUser || legacyUser);
  const isCarrier = currentApiUser?.role === "CARRIER";
  const [sqliteListing, setSqliteListing] = useState<CargoListing | null | undefined>(undefined);

  // Müraciət forması state-ləri
  const [contactSheetOpen, setContactSheetOpen] = useState(false);

  // Müraciət forması state-ləri
  const [applyVehicleId, setApplyVehicleId] = useState("");
  const [applyMessage, setApplyMessage] = useState("");
  const [applyPrice, setApplyPrice] = useState("");
  const [applyVehicles, setApplyVehicles] = useState<VehicleOption[]>([]);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState("");

  useEffect(() => {
    if (!isCarrier) return;
    fetch("/api/vehicles", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(payload => {
        const list: VehicleOption[] = (payload?.data ?? []).filter((v: { status: string }) => v.status === "APPROVED");
        setApplyVehicles(list);
        if (list.length > 0) setApplyVehicleId(list[0].id);
      })
      .catch(() => {});
  }, [isCarrier]);

  async function handleApply(listingId: string) {
    setApplyError("");
    if (!applyVehicleId) { setApplyError("Avtomobil seçin."); return; }
    setApplyLoading(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cargoPostId: listingId,
          vehicleId: applyVehicleId,
          message: applyMessage || undefined,
          offeredPrice: applyPrice ? Number(applyPrice) : undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setApplyError(payload?.message ?? "Müraciət göndərilmədi.");
      } else {
        setApplySuccess(true);
      }
    } catch {
      setApplyError("Şəbəkə xətası. Yenidən cəhd edin.");
    } finally {
      setApplyLoading(false);
    }
  }

  const listing = sqliteListing ?? null;

  const localizedTitle = (locale !== "az" && listing?.translations?.[locale]?.title) || listing?.title || "";
  const localizedDescription = (locale !== "az" && listing?.translations?.[locale]?.description) || listing?.description || "";

  const gallery = useMemo(() => listingImages(listing?.photo, listing?.photos || []), [listing?.photo, listing?.photos]);
  const listingPlaceholderTone = useMemo(
    () => (listing ? listingVisualTone(listing) : null),
    [listing]
  );
  const ListingPlaceholderIcon = listingPlaceholderTone?.icon;
  
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Rastgele ama tutarlı bir görüntülenme sayısı (id bazlı seed)
  const views = (listing as { views?: number })?.views || 0;

  // Format phone number logic
  const formattedPhone = useMemo(() => {
    if (!listing?.ownerPhone) return "";
    const digits = listing.ownerPhone.replace(/[^0-9]/g, "");
    // If it starts with 994
    if (digits.startsWith("994") && digits.length === 12) {
       return `+994 ${digits.substring(3,5)} ${digits.substring(5,8)} ${digits.substring(8,10)} ${digits.substring(10,12)}`;
    }
    // If it starts with 0 (e.g. 050)
    if (digits.startsWith("0") && digits.length === 10) {
        return `+994 ${digits.substring(1,3)} ${digits.substring(3,6)} ${digits.substring(6,8)} ${digits.substring(8,10)}`;
    }
    // If it's just 9 digits (e.g. 501234567)
    if (digits.length === 9) {
        return `+994 ${digits.substring(0,2)} ${digits.substring(2,5)} ${digits.substring(5,7)} ${digits.substring(7,9)}`;
    }
    return listing.ownerPhone;
  }, [listing?.ownerPhone]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function loadListing() {
      try {
        const response = await fetch(`/api/public/listings/${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Public listing request failed.");
        }

        const payload = (await response.json()) as { data?: CargoListing | null };
        if (!cancelled) {
          setSqliteListing(payload.data ?? null);
        }
      } catch {
        if (!cancelled) {
          setSqliteListing(null);
        }
      }
    }

    setSqliteListing(undefined);
    loadListing();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (sqliteListing === undefined) {
    return (
      <PublicPage emphasizeBackground>
        <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-logistics-orange" />
          <p className="text-lg font-medium text-slate-500">{t("ld_loading", "Məlumatlar yüklənir...")}</p>
        </div>
      </PublicPage>
    );
  }

  if (!listing) {
    return (
      <PublicPage emphasizeBackground>
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="surface-panel p-10 text-center">
            <h1 className="text-2xl font-bold text-navy-900">{t("ld_not_found", "Elan tapılmadı")}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {t("ld_not_found_desc", "Elan silinmiş ola bilər və ya public görünüşdən çıxarılıb.")}
            </p>
          </div>
        </section>
      </PublicPage>
      );
    }

    const detailId = numericIdFromListingId(listing.id);
  const ownerDisplayName =
    (listing.ownerName && listing.ownerName !== "Kargo Yük Sahibi" ? listing.ownerName : t("ld_default_user", "İstifadəçi"));
  const ownerListingHref = `/seller/${listing.ownerId}`;

  const getMembershipDuration = (createdAt?: string) => {
    if (!createdAt) return t("ld_new_user", "Yeni istifadəçi");
    try {
      const createdDate = new Date(createdAt);
      const now = new Date();
      let years = now.getFullYear() - createdDate.getFullYear();
      let months = now.getMonth() - createdDate.getMonth();
      if (months < 0) { years--; months += 12; }
      if (years > 0) return t("ld_member_years", `İstifadəçi ${years} ildən çoxdur platformadadır`).replace("{n}", String(years));
      if (months > 0) return t("ld_member_months", `İstifadəçi ${months} aydır platformadadır`).replace("{n}", String(months));
      return t("ld_new_user", "Yeni istifadəçi");
    } catch {
      return t("ld_new_user", "Yeni istifadəçi");
    }
  };
  
  const membershipText = getMembershipDuration(listing.ownerCreatedAt);

  const activeImage = gallery[activeImageIndex] || gallery[0];
  const quantityLabel = formatQuantity(listing.quantity);
  const dimensionsLabel = formatDimensions(listing.length, listing.width, listing.height);
  const volumeValue = resolveVolumeValue(
    listing.volume,
    listing.length,
    listing.width,
    listing.height
  );
  const volumeLabel = volumeValue !== null ? `${formatVolume(volumeValue)} m³` : "";

  function moveGallery(step: number) {
    setActiveImageIndex((current) => {
      if (gallery.length === 0) {
        return 0;
      }

      return (current + step + gallery.length) % gallery.length;
    });
  }

  return (
    <PublicPage emphasizeBackground>
      {/* Floating CTA bar — mobilde sabit altta, desktopda gizli */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md xl:hidden"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom,0px))" }}>
        <a
          href={`tel:${listing.ownerPhone}`}
          data-no-loader
          className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-logistics-orange py-3.5 text-[1rem] font-bold text-white shadow-[0_4px_16px_rgba(249,115,22,0.35)]"
        >
          <PhoneCall className="h-5 w-5" />
          Zəng et
        </a>
        <a
          href={`https://wa.me/${listing.ownerPhone?.replace(/[^0-9]/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          data-no-loader
          className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#25d366] py-3.5 text-[1rem] font-bold text-white shadow-[0_4px_16px_rgba(37,211,102,0.35)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
          </svg>
          WhatsApp
        </a>
      </div>

      <section className="mx-auto max-w-[1280px] px-4 pb-28 pt-5 sm:px-6 xl:pb-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-[0.88rem] text-slate-400">
          <Link href="/" className="transition hover:text-navy-900">{t("ld_breadcrumb_home", "Ana səhifə")}</Link>
          <span>›</span>
          <Link href="/loads" className="transition hover:text-navy-900">{t("ld_breadcrumb_listings", "Elanlar")}</Link>
          <span>›</span>
          <span className="text-navy-900">{listing.pickupCity} → {listing.deliveryCity}</span>
        </div>

        {/* Title */}
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-navy-900 sm:text-[1.75rem]">
          {localizedTitle}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[0.93rem] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-slate-400" />
            {listing.pickupCity}
            <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
            {listing.deliveryCity}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Package2 className="h-4 w-4 text-slate-400" />
            {listing.cargoType}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Scale className="h-4 w-4 text-slate-400" />
            {formatWeightKg(listing.weight)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            {formatDateNumeric(listing.pickupDeadlineDate || listing.pickupDate || listing.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-400">
            <Eye className="h-4 w-4" />
            {views} {t("ld_views", "baxış")}
          </span>
        </div>

        {/* Gallery and seller contact share the top row on listing detail pages. */}
        <div className="mt-5 grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr),380px]">
          <div className="min-w-0">
            <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          {gallery.length > 0 ? (
            <div className="grid gap-2 p-2 sm:grid-cols-[minmax(0,1fr),160px] lg:grid-cols-[minmax(0,1fr),200px]">
              {/* Ana görsel */}
              <div className="relative overflow-hidden rounded-[14px] bg-slate-100" style={{ minHeight: 320 }}>
                <img src={activeImage} alt={listing.title} loading="eager" className="absolute inset-0 h-full w-full object-cover" />
                {gallery.length > 1 && (
                  <>
                    <button type="button" data-no-loader onClick={() => moveGallery(-1)}
                      className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy-900 shadow-md transition hover:bg-white">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button type="button" data-no-loader onClick={() => moveGallery(1)}
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy-900 shadow-md transition hover:bg-white">
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
                      {activeImageIndex + 1} / {gallery.length}
                    </div>
                  </>
                )}
              </div>
              {/* Thumbnail'lar */}
              {gallery.length > 1 && (
                <div className="flex flex-row gap-2 sm:flex-col">
                  {gallery.slice(1, 5).map((image, index) => {
                    const actualIndex = index + 1;
                    const extraCount = Math.max(gallery.length - 5, 0);
                    return (
                      <button key={`${image}-${index}`} type="button" data-no-loader
                        onClick={() => setActiveImageIndex(actualIndex)}
                        className={cn(
                          "relative flex-1 overflow-hidden rounded-[12px] bg-slate-100 transition sm:flex-none sm:h-[calc(25%-6px)]",
                          activeImageIndex === actualIndex && "ring-2 ring-logistics-orange ring-offset-1"
                        )}>
                        <div className="relative aspect-[4/3]">
                          <img src={image} alt={listing.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                        </div>
                        {index === 3 && extraCount > 0 ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                            <span className="text-xl font-bold">+{extraCount}</span>
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className={cn("flex items-center justify-center rounded-[18px]", listingPlaceholderTone?.panel ?? "bg-slate-100")} style={{ minHeight: 280 }}>
              {ListingPlaceholderIcon ? <ListingPlaceholderIcon className="h-20 w-20" /> : <Package2 className="h-20 w-20 text-slate-300" />}
            </div>
          )}
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-slate-500">
                  {listing.ownerProfilePicture ? <img src={listing.ownerProfilePicture} alt={ownerDisplayName} className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-bold text-navy-900">{ownerDisplayName}</p><ShieldCheck className="h-4 w-4 text-emerald-500" /></div>
                  <p className="text-sm text-slate-500">{membershipText}</p>
                  {isAuthorized && listing.ownerEmail ? <p className="text-sm text-slate-500">{listing.ownerEmail}</p> : null}
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <button type="button" data-no-loader onClick={() => setContactSheetOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-logistics-orange py-3 text-[1rem] font-bold text-white shadow-[0_4px_16px_rgba(249,115,22,0.28)] transition hover:bg-orange-600"><PhoneCall className="h-5 w-5" />{formattedPhone}</button>
                <a href={`https://wa.me/${listing.ownerPhone?.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" data-no-loader className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-[#25d366] py-3 text-[1rem] font-bold text-white shadow-[0_4px_16px_rgba(37,211,102,0.28)] transition hover:bg-[#20bc5a]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 1 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                  WhatsApp ilə yaz
                </a>
              </div>
              <div className="mt-3 text-center"><Link href={ownerListingHref} className="text-sm font-medium text-logistics-orange hover:underline">{t("ld_all_listings", "İstifadəçinin bütün elanları")}</Link></div>
            </div>
            <ContactBottomSheet phone={listing.ownerPhone || ""} open={contactSheetOpen} onClose={() => setContactSheetOpen(false)} />
          </aside>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="mt-5 grid gap-5">

          {/* Sol kolon — bilgiler */}
          <div className="space-y-4">

            {/* Yük bilgileri */}
            <div className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[1.05rem] font-bold text-navy-900">{t("ld_info_title", "Yük məlumatları")}</h2>
                {listing.price ? (
                  <span className="text-[1.35rem] font-extrabold tracking-tight text-logistics-orange" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {listing.price} <span className="text-sm font-semibold text-slate-400">AZN</span>
                  </span>
                ) : (
                  <span className="text-[0.95rem] font-semibold italic text-slate-400">
                    {t("ld_negotiable", "Razılaşma ilə")}
                  </span>
                )}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailFactItem icon={<Package2 className="h-5 w-5" />} label={t("ld_cargo_type", "Yük növü")} value={listing.cargoType} />
                <DetailFactItem icon={<MapPin className="h-5 w-5" />} label={t("ld_pickup", "Yükləmə yeri")} value={listing.pickupAddress || listing.pickupCity} />
                <DetailFactItem icon={<Scale className="h-5 w-5" />} label={t("ld_weight", "Çəki")} value={formatWeightKg(listing.weight)} />
                <DetailFactItem icon={<MapPin className="h-5 w-5" />} label={t("ld_delivery", "Çatdırılma yeri")} value={listing.deliveryAddress || listing.deliveryCity} />
                <DetailFactItem icon={<Truck className="h-5 w-5" />} label={t("ld_vehicle_type", "Nəqliyyat növü")} value={listing.vehicleType || t("ld_any_vehicle", "Fərq etmir")} />
                <DetailFactItem icon={<CalendarDays className="h-5 w-5" />} label={t("ld_deadline", "Ən gec götürülmə")} value={formatDateNumeric(listing.pickupDeadlineDate || listing.pickupDate || listing.createdAt)} />
                {quantityLabel ? <DetailFactItem icon={<Package2 className="h-5 w-5" />} label={t("ld_qty", "Say")} value={quantityLabel} /> : null}
                {volumeLabel ? <DetailFactItem icon={<Package2 className="h-5 w-5" />} label={t("ld_volume", "Həcm")} value={volumeLabel} /> : null}
                {dimensionsLabel ? <DetailFactItem icon={<Package2 className="h-5 w-5" />} label={t("ld_dims", "Ölçülər")} value={dimensionsLabel} /> : null}
                <button type="button" data-no-loader onClick={() => setContactSheetOpen(true)} className="grid grid-cols-[22px,1fr] gap-3 w-full text-left group">
                  <div className="pt-0.5 text-logistics-orange"><Phone className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-500">{t("ld_contact", "Əlaqə nömrəsi")}</p>
                    <p className="mt-1 text-[1rem] font-semibold text-logistics-orange group-hover:underline">{formattedPhone}</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Açıqlama */}
            {localizedDescription ? (
              <div className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                <h2 className="text-[1.05rem] font-bold text-navy-900">{t("ld_desc_title", "Elanın təsviri")}</h2>
                <div className="mt-3 space-y-2 text-[0.93rem] leading-7 text-slate-600">
                  <p>{localizedDescription}</p>
                </div>
              </div>
            ) : null}

            {/* Əlavə məlumat */}
            <div className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <h3 className="text-[1.05rem] font-bold text-navy-900">{t("ld_extra_info", "Əlavə məlumat")}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                <div><p className="text-xs text-slate-500">{t("ld_loading_help", "Yükləmə yardımı")}</p><p className="mt-0.5 text-sm font-semibold text-navy-900">{listing.needsLoadingHelp || t("ld_no_data", "Məlumat yoxdur")}</p></div>
                <div><p className="text-xs text-slate-500">{t("ld_unloading_help", "Boşaltma yardımı")}</p><p className="mt-0.5 text-sm font-semibold text-navy-900">{listing.needsUnloadingHelp || t("ld_no_data", "Məlumat yoxdur")}</p></div>
                <div><p className="text-xs text-slate-500">{t("ld_invoice", "Faktura")}</p><p className="mt-0.5 text-sm font-semibold text-navy-900">{listing.requiresInvoice || t("ld_no", "Xeyr")}</p></div>
                <div><p className="text-xs text-slate-500">{t("ld_roundtrip", "Gediş-dönüş")}</p><p className="mt-0.5 text-sm font-semibold text-navy-900">{listing.roundTrip || t("ld_no", "Xeyr")}</p></div>
                <div><p className="text-xs text-slate-500">{t("ld_special_req", "Xüsusi tələb")}</p><p className="mt-0.5 text-sm font-semibold text-navy-900">{listing.note || t("ld_none", "Yoxdur")}</p></div>
              </div>
            </div>

            {/* Xəritə — solda, aşağıda */}
            <div className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <h2 className="mb-4 text-[1.05rem] font-bold text-navy-900">{t("ld_map_title", "Xəritədə marşrut")}</h2>
              <RouteMap fromCity={listing.pickupCity} fromAddress={listing.pickupAddress} toCity={listing.deliveryCity} toAddress={listing.deliveryAddress} />
            </div>

          </div>

          {/* Sağ kolon — satıcı + iletişim (sticky) */}
          <aside className="space-y-4">
            
            {/* Satıcı + iletişim */}
            <div className="sticky top-20 space-y-4">
              <div className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 overflow-hidden">
                    {listing.ownerProfilePicture ? (
                      <img src={listing.ownerProfilePicture} alt={ownerDisplayName} className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-navy-900">{ownerDisplayName}</p>
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    </div>
                    <p className="text-sm text-slate-500">{membershipText}</p>
                    {isAuthorized && listing.ownerEmail ? (
                      <p className="text-sm text-slate-500">{listing.ownerEmail}</p>
                    ) : null}
                  </div>
                </div>

                {/* Desktop iletişim butonları */}
                <div className="mt-4 flex flex-col gap-2">
                  <button type="button" data-no-loader onClick={() => setContactSheetOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-logistics-orange py-3 text-[1rem] font-bold text-white shadow-[0_4px_16px_rgba(249,115,22,0.28)] transition hover:bg-orange-600">
                    <PhoneCall className="h-5 w-5" />
                    {formattedPhone}
                  </button>
                  <a href={`https://wa.me/${listing.ownerPhone?.replace(/[^0-9]/g, "")}`}
                    target="_blank" rel="noopener noreferrer" data-no-loader
                    className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-[#25d366] py-3 text-[1rem] font-bold text-white shadow-[0_4px_16px_rgba(37,211,102,0.28)] transition hover:bg-[#20bc5a]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                    </svg>
                    WhatsApp ilə yaz
                  </a>
                </div>

                <div className="mt-3 text-center">
                  <Link href={ownerListingHref} className="text-sm font-medium text-logistics-orange hover:underline">
                    {t("ld_all_listings", "İstifadəçinin bütün elanları")}
                  </Link>
                </div>
              </div>

              <ContactBottomSheet phone={listing.ownerPhone || ""} open={contactSheetOpen} onClose={() => setContactSheetOpen(false)} />

              {/* CARRIER müraciət forması */}
              {isCarrier && (
                <div className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                  <h3 className="font-bold text-navy-900 mb-3">Müraciət göndər</h3>
                  {applySuccess ? (
                    <div className="rounded-[10px] bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 font-medium">
                      Müraciətiniz uğurla göndərildi!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {applyVehicles.length === 0 ? (
                        <p className="text-sm text-slate-500">Təsdiqlənmiş avtomobiliniz yoxdur. <Link href="/carrier/vehicles/new" className="text-logistics-orange underline">Avtomobil əlavə et</Link></p>
                      ) : (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Avtomobil</label>
                            <select value={applyVehicleId} onChange={e => setApplyVehicleId(e.target.value)} className="w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-logistics-orange">
                              {applyVehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} — {v.plateNumber}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Qiymət (AZN, istəyə görə)</label>
                            <input type="number" value={applyPrice} onChange={e => setApplyPrice(e.target.value)} placeholder="məs. 350" className="w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-logistics-orange" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Mesaj (istəyə görə)</label>
                            <textarea value={applyMessage} onChange={e => setApplyMessage(e.target.value)} placeholder="Salam, bu yükü daşıya bilərəm..." rows={3} className="w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-logistics-orange resize-none" />
                          </div>
                          {applyError && <p className="text-xs text-red-600">{applyError}</p>}
                          <button type="button" onClick={() => handleApply(listing.id)} disabled={applyLoading} data-no-loader className="w-full rounded-[10px] bg-logistics-orange py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60">
                            {applyLoading ? "Göndərilir..." : "Müraciət göndər"}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Elan meta */}
              <div className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                <DetailInfoRow label={t("ld_post_date", "Elan tarixi")} value={formatListingDate(listing.createdAt)} />
                <DetailInfoRow label={t("ld_listing_type", "Elan növü")} value={t("ld_listing_type_cargo", "Yük")} />
                <DetailInfoRow label={t("ld_listing_id", "Elan ID")} value={detailId} />
                <DetailInfoRow label={t("ld_status", "Status")} value={<StatusBadge status={effectiveStatus(listing)} />} />
              </div>

              {/* Favori + Paylaş + Çap */}
              <div className="flex items-center gap-2">
                <FavoriteToggleButton listingId={listing.id} showLabel
                  className="flex flex-1 items-center justify-center gap-2 rounded-[13px] border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  iconClassName="h-4 w-4" labelClassName="leading-none" />
                <button type="button" data-no-loader onClick={() => setIsShareModalOpen(true)} className="flex h-[42px] w-[42px] items-center justify-center rounded-[13px] border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
                  <Share2 className="h-4 w-4" />
                </button>
                <button type="button" data-no-loader onClick={() => window.print()} className="flex h-[42px] w-[42px] items-center justify-center rounded-[13px] border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
                  <Printer className="h-4 w-4" />
                </button>
                <button type="button" data-no-loader onClick={() => alert(t("ld_report_success", "Şikayətiniz qeydə alındı."))} className="flex h-[42px] w-[42px] items-center justify-center rounded-[13px] border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
                  <Flag className="h-4 w-4" />
                </button>
              </div>

              {/* Güvenlik */}
              <div className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-2 text-navy-900">
                  <ShieldCheck className="h-5 w-5" />
                  <h3 className="font-bold">{t("ld_safety_title", "Təhlükəsizlik")}</h3>
                </div>
                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <p>{t("ld_safety_1", "Ödənişləri yalnız rəsmi qaydada edin.")}</p>
                  <p>{t("ld_safety_2", "Şəxsi məlumatlarınızı paylaşmayın.")}</p>
                  <p>{t("ld_safety_3", "Şübhəli hallarda dəstək ilə əlaqə saxlayın.")}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {isShareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 transition-opacity" onClick={() => setIsShareModalOpen(false)}>
            <div className="w-full max-w-sm rounded-[20px] bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-navy-900">{t("ld_share_title", "Elanı paylaş")}</h3>
                <button 
                  onClick={() => setIsShareModalOpen(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              
              <div className="flex flex-wrap justify-center gap-4">
                <WhatsappShareButton url={window.location.href} title={`${localizedTitle} - ${listing.pickupCity} -> ${listing.deliveryCity}`}>
                  <div className="flex flex-col items-center gap-2 transition hover:scale-110">
                    <WhatsappIcon size={48} round />
                    <span className="text-xs font-medium text-slate-600">WhatsApp</span>
                  </div>
                </WhatsappShareButton>

                <TelegramShareButton url={window.location.href} title={`${localizedTitle} - ${listing.pickupCity} -> ${listing.deliveryCity}`}>
                  <div className="flex flex-col items-center gap-2 transition hover:scale-110">
                    <TelegramIcon size={48} round />
                    <span className="text-xs font-medium text-slate-600">Telegram</span>
                  </div>
                </TelegramShareButton>

                <FacebookShareButton url={window.location.href}>
                  <div className="flex flex-col items-center gap-2 transition hover:scale-110">
                    <FacebookIcon size={48} round />
                    <span className="text-xs font-medium text-slate-600">Facebook</span>
                  </div>
                </FacebookShareButton>

                <TwitterShareButton url={window.location.href} title={`${localizedTitle} - ${listing.pickupCity} -> ${listing.deliveryCity}`}>
                  <div className="flex flex-col items-center gap-2 transition hover:scale-110">
                    <XIcon size={48} round />
                    <span className="text-xs font-medium text-slate-600">X (Twitter)</span>
                  </div>
                </TwitterShareButton>

                <LinkedinShareButton url={window.location.href} title={localizedTitle}>
                  <div className="flex flex-col items-center gap-2 transition hover:scale-110">
                    <LinkedinIcon size={48} round />
                    <span className="text-xs font-medium text-slate-600">LinkedIn</span>
                  </div>
                </LinkedinShareButton>
              </div>

              <div className="mt-6 flex items-center gap-2 rounded-[12px] border border-slate-200 bg-slate-50 p-2">
                <input 
                  type="text" 
                  readOnly 
                  value={window.location.href}
                  className="flex-1 bg-transparent px-2 text-sm text-slate-600 outline-none" 
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert(t("ld_link_copied", "Link kopyalandı!"));
                  }}
                  className="rounded-[8px] bg-white px-3 py-1.5 text-sm font-semibold text-logistics-orange shadow-sm border border-slate-200 hover:bg-orange-50 transition"
                >
                  Kopyala
                </button>
              </div>
            </div>
          </div>
        )}
    </PublicPage>
  );
}
