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

export function LoadDetailsPageClient({ id }: { id: string }) {
  const { t } = useLocale();
  const { user: currentApiUser, legacyUser, isLoading: isAuthLoading } = useApiAuthUser();
  const isAuthorized = !!(currentApiUser || legacyUser);
  const [sqliteListing, setSqliteListing] = useState<CargoListing | null | undefined>(undefined);
  const [allListings, setAllListings] = useState<CargoListing[]>([]);

  // Fetch all listings to ensure we have data if Context is empty (like on page load)
  useEffect(() => {
    async function fetchListings() {
      try {
        const res = await fetch("/api/public/listings");
        if (res.ok) {
          const payload = await res.json();
          if (payload.data) {
            setAllListings(payload.data);
          }
        }
      } catch (e) {
        console.error("Failed to load listings", e);
      }
    }
    fetchListings();
  }, []);

  const listing =
    sqliteListing ??
    allListings.find((item) => item.id === id);

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

  if (sqliteListing === undefined || isAuthLoading) {
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
  const ownerListingHref = `/?search=${encodeURIComponent(listing.ownerPhone || '')}`;

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
      <section className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2 text-[0.95rem] text-slate-500">
          <Link href="/" className="transition hover:text-navy-900">
            {t("ld_breadcrumb_home", "Ana səhifə")}
          </Link>
          <span>›</span>
          <Link href="/loads" className="transition hover:text-navy-900">
            {t("ld_breadcrumb_listings", "Elanlar")}
          </Link>
          <span>›</span>
          <span>{t("ld_breadcrumb_loads", "Yüklər")}</span>
          <span>›</span>
          <span>{t("ld_breadcrumb_dry", "Quru yük")}</span>
          <span>›</span>
          <span className="text-navy-900">
            {listing.pickupCity} → {listing.deliveryCity}
          </span>
        </div>

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
          {listing.title} – {listing.pickupCity} → {listing.deliveryCity}
        </h1>

        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-[1rem] text-slate-600">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-5 w-5 text-slate-400" />
              {listing.pickupAddress || listing.pickupCity}
              <ArrowRight className="h-4 w-4 text-slate-400" />
              {listing.deliveryCity}
            </span>
            <span className="inline-flex items-center gap-2">
              <Package2 className="h-5 w-5 text-slate-400" />
              {listing.cargoType}
            </span>
            <span className="inline-flex items-center gap-2">
              <Scale className="h-5 w-5 text-slate-400" />
              {formatWeightKg(listing.weight)}
            </span>
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-slate-400" />
              {formatDateNumeric(
                listing.pickupDeadlineDate || listing.pickupDate || listing.createdAt
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="grow rounded-[14px] border border-slate-200 bg-white px-4 py-2.5 text-[0.96rem] font-semibold text-slate-600 sm:grow-0">
              ID: {detailId}
            </div>
            <div className="grow rounded-[14px] border border-slate-200 bg-white px-4 py-2.5 text-[0.96rem] font-semibold text-slate-600 sm:grow-0">
              <span className="inline-flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {views} {t("ld_views", "baxış")}
              </span>
            </div>
            <FavoriteToggleButton
              listingId={listing.id}
              showLabel
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white px-4 text-[0.96rem] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
              iconClassName="h-4 w-4"
              labelClassName="leading-none"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.62fr),408px]">
          <div className="space-y-5">
            <div className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
                <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr),174px]">
                  {gallery.length > 0 ? (
                    <>
                      <div className="relative min-h-[408px] overflow-hidden rounded-[14px] bg-slate-100">
                        <img src={activeImage} alt={listing.title} loading="eager" className="absolute inset-0 h-full w-full object-cover" />

                        {gallery.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() => moveGallery(-1)}
                              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-navy-900 shadow-lg"
                            >
                              <ArrowLeft className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveGallery(1)}
                              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-navy-900 shadow-lg"
                            >
                              <ArrowRight className="h-5 w-5" />
                            </button>
                            <div className="absolute bottom-4 left-4 rounded-xl bg-black/72 px-3 py-2 text-[0.94rem] font-semibold text-white">
                              {activeImageIndex + 1} / {gallery.length}
                            </div>
                          </>
                        )}
                      </div>

                      {gallery.length > 1 && (
                        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
                          {gallery.slice(1, 4).map((image, index) => {
                            const actualIndex = index + 1;
                            const extraCount = Math.max(gallery.length - 4, 0);

                            return (
                              <button
                                key={`${image}-${index}`}
                                type="button"
                                onClick={() => setActiveImageIndex(actualIndex)}
                                className={cn(
                                  "relative overflow-hidden rounded-[14px] bg-slate-100 text-left transition",
                                  activeImageIndex === actualIndex && "ring-2 ring-logistics-orange ring-offset-2 ring-offset-white"
                                )}
                              >
                                <div className="relative aspect-[4/3] lg:aspect-[6/4.7]">
                                  <img src={image} alt={listing.title} loading="eager" className="absolute inset-0 h-full w-full object-cover" />
                                </div>
                                {index === 2 && extraCount > 0 ? (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-center text-white">
                                    <span className="text-3xl font-bold">+{extraCount}</span>
                                    <span className="mt-1 text-sm font-semibold">{t("ld_more", "daha çox")}</span>
                                  </div>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      className={cn(
                        "relative flex min-h-[408px] items-center justify-center overflow-hidden rounded-[14px] lg:col-span-2",
                        listingPlaceholderTone?.panel ?? "bg-slate-100"
                      )}
                    >
                      {ListingPlaceholderIcon ? (
                        <ListingPlaceholderIcon className="h-20 w-20" />
                      ) : (
                        <Package2 className="h-20 w-20 text-slate-300" />
                      )}
                    </div>
                  )}
                </div>
            </div>

            <div className="rounded-[16px] border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.04)] mb-6">
              <h2 className="text-xl font-bold text-navy-900 mb-4">{t("ld_map_title", "Xəritədə marşrut")}</h2>
              <RouteMap 
                fromCity={listing.pickupCity} 
                fromAddress={listing.pickupAddress} 
                toCity={listing.deliveryCity} 
                toAddress={listing.deliveryAddress} 
              />
            </div>

            <div className="rounded-[16px] border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
              <h2 className="text-xl font-bold text-navy-900">{t("ld_desc_title", "Elanın təsviri")}</h2>
              <div className="mt-4 space-y-2 text-[0.95rem] leading-7 text-slate-600">
                <p>{listing.description}</p>
                <p>
                  {t("ld_desc_cargo", "Yük")}{" "}
                  {quantityLabel ? quantityLabel.toLocaleLowerCase("az") : t("ld_desc_std_batch", "standart partiya")}{" "}
                  {t("ld_desc_ready", "şəklində daşınmaya hazırdır. Etibarlı, vaxtında çatdırılma təmin edən daşıyıcılarla əməkdaşlıq etmək istərdik.")}
                </p>
              </div>
            </div>

            <div className="rounded-[16px] border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
              <h2 className="text-xl font-bold text-navy-900">{t("ld_info_title", "Yük məlumatları")}</h2>
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <DetailFactItem icon={<Package2 className="h-5 w-5" />} label={t("ld_cargo_type", "Yük növü")} value={listing.cargoType} />
                <DetailFactItem icon={<MapPin className="h-5 w-5" />} label={t("ld_pickup", "Yükləmə yeri")} value={listing.pickupAddress || listing.pickupCity} />
                <DetailFactItem icon={<Scale className="h-5 w-5" />} label={t("ld_weight", "Çəki")} value={formatWeightKg(listing.weight)} />
                <DetailFactItem icon={<MapPin className="h-5 w-5" />} label={t("ld_delivery", "Çatdırılma yeri")} value={listing.deliveryAddress || listing.deliveryCity} />
                <DetailFactItem
                  icon={<Truck className="h-5 w-5" />}
                  label={t("ld_vehicle_type", "Ehtimal olunan nəqliyyat növü")}
                  value={listing.vehicleType || t("ld_any_vehicle", "Fərq etmir")}
                />
                <DetailFactItem
                  icon={<CalendarDays className="h-5 w-5" />}
                  label={t("ld_deadline", "Ən gec götürülmə tarixi")}
                  value={formatDateNumeric(listing.pickupDeadlineDate || listing.pickupDate || listing.createdAt)}
                />
                <DetailFactItem
                  icon={<Phone className="h-5 w-5" />}
                  label={t("ld_contact", "Əlaqə nömrəsi")}
                  value={listing.ownerPhone}
                />
                {quantityLabel ? (
                  <DetailFactItem icon={<Package2 className="h-5 w-5" />} label={t("ld_qty", "Say")} value={quantityLabel} />
                ) : null}
                {volumeLabel ? (
                  <DetailFactItem icon={<Package2 className="h-5 w-5" />} label={t("ld_volume", "Həcm")} value={volumeLabel} />
                ) : null}
                {dimensionsLabel ? (
                  <DetailFactItem icon={<Package2 className="h-5 w-5" />} label={t("ld_dims", "Ölçülər")} value={dimensionsLabel} />
                ) : null}
              </div>

              <div className="mt-6 border-t border-slate-200 pt-5">
                <h3 className="text-lg font-bold text-navy-900">{t("ld_extra_info", "Əlavə məlumat")}</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <p className="text-sm text-slate-500">{t("ld_loading_help", "Yükləmə ilə bağlı yardım")}</p>
                    <p className="mt-1 font-semibold text-navy-900">{listing.needsLoadingHelp || t("ld_no_data", "Məlumat yoxdur")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t("ld_unloading_help", "Boşaltma ilə bağlı yardım")}</p>
                    <p className="mt-1 font-semibold text-navy-900">{listing.needsUnloadingHelp || t("ld_no_data", "Məlumat yoxdur")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t("ld_invoice", "Faktura tələb olunur")}</p>
                    <p className="mt-1 font-semibold text-navy-900">{listing.requiresInvoice || t("ld_no", "Xeyr")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t("ld_roundtrip", "Gediş-dönüş yük imkanı")}</p>
                    <p className="mt-1 font-semibold text-navy-900">{listing.roundTrip || t("ld_no", "Xeyr")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t("ld_special_req", "Xüsusi tələblər")}</p>
                    <p className="mt-1 font-semibold text-navy-900">{listing.note || t("ld_none", "Yoxdur")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[16px] border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
              <h2 className="text-[1.3rem] font-bold text-navy-900">{t("ld_seller_title", "Satıcı / Elanı yerləşdirən")}</h2>

              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 overflow-hidden">
                  {listing.ownerProfilePicture ? (
                    <img src={listing.ownerProfilePicture} alt={ownerDisplayName} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold text-navy-900">{ownerDisplayName}</p>
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="mt-1 text-[0.95rem] text-slate-600">{t("ld_user_role", "İstifadəçi")}</p>
                  {isAuthorized && listing.ownerEmail ? (
                    <p className="mt-1 text-sm text-slate-500">{listing.ownerEmail}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-slate-500">{membershipText}</p>
                </div>
              </div>

              <div className="mt-5 rounded-[14px] border border-logistics-orange/65 px-5 py-4">
                <div className="flex flex-col gap-3">
                  <a
                    href={`tel:${listing.ownerPhone}`}
                    className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-logistics-orange py-3 text-[1.05rem] font-semibold text-white shadow-[0_6px_20px_rgba(249,115,22,0.25)] transition hover:-translate-y-1 hover:bg-orange-600"
                  >
                    <PhoneCall className="h-5 w-5" />
                    {listing.ownerPhone}
                  </a>
                  <a
                    href={`https://wa.me/${listing.ownerPhone?.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-slate-300 bg-white py-3 text-[1.02rem] font-semibold text-navy-900 shadow-sm transition hover:-translate-y-1 hover:bg-slate-50"
                  >
                    <MessageCircleMore className="h-5 w-5" />
                    {t("ld_whatsapp", "WhatsApp ilə yaz")}
                  </a>
                </div>

                <div className="mt-3 text-center">
                  <p className="text-[0.85rem] text-slate-500">
                    {t("ld_call_hint_pre", "Zəng edərkən")} <b>Tranzit.AZ</b>{t("ld_call_hint_post", "-dan gəldiyinizi qeyd etməyi unutmayın.")}
                  </p>
                  
                  <Link
                    href={ownerListingHref}
                    className="mt-4 inline-block text-[0.95rem] font-medium text-logistics-orange transition hover:text-orange-600 hover:underline"
                  >
                    {t("ld_all_listings", "İstifadəçinin bütün elanları")}
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
              <DetailInfoRow label={t("ld_post_date", "Elan tarixi")} value={formatListingDate(listing.createdAt)} />
              <DetailInfoRow label={t("ld_updated_date", "Yenilənmə tarixi")} value={formatListingDate(listing.createdAt)} />
              <DetailInfoRow label={t("ld_listing_type", "Elan növü")} value={t("ld_listing_type_cargo", "Yük")} />
              <DetailInfoRow label={t("ld_cargo_category", "Yük kateqoriyası")} value={listing.cargoType} />
              <DetailInfoRow
                label={t("ld_price", "Təklif olunan qiymət")}
                value={listing.price ? `${listing.price} AZN` : t("ld_negotiable", "Razılaşma ilə")}
              />
              <DetailInfoRow label={t("ld_listing_id", "Elan ID")} value={detailId} />
              <DetailInfoRow label={t("ld_status", "Status")} value={<StatusBadge status={effectiveStatus(listing)} />} />
            </div>

            <div className="rounded-[16px] border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3 text-navy-900">
                <ShieldCheck className="h-6 w-6" />
                <h3 className="text-lg font-bold">{t("ld_safety_title", "Təhlükəsizlik tövsiyələri")}</h3>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p>{t("ld_safety_1", "Ödənişləri yalnız rəsmi qaydada edin.")}</p>
                <p>{t("ld_safety_2", "Şəxsi məlumatlarınızı paylaşmayın.")}</p>
                <p>{t("ld_safety_3", "Şübhəli hallarda dəstək xidmətimizlə əlaqə saxlayın.")}</p>
              </div>
              <Link href="/how-it-works" className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700">
                {t("ld_more_info", "Daha ətraflı")}
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-0 overflow-hidden rounded-[16px] border border-slate-200 bg-white text-sm font-semibold text-slate-600 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
              <button type="button" onClick={() => alert(t("ld_report_success", "Şikayətiniz uğurla qeydə alındı. Təşəkkür edirik!"))} className="flex min-h-14 items-center justify-center gap-2 border-r border-slate-200 transition hover:bg-slate-50">
                <Flag className="h-4 w-4" />
                {t("ld_report", "Şikayət et")}
              </button>
              <button type="button" onClick={() => setIsShareModalOpen(true)} className="flex min-h-14 items-center justify-center gap-2 border-r border-slate-200 transition hover:bg-slate-50">
                <Share2 className="h-4 w-4" />
                {t("ld_share", "Paylaş")}
              </button>
              <button type="button" onClick={() => window.print()} className="flex min-h-14 items-center justify-center gap-2 transition hover:bg-slate-50">
                <Printer className="h-4 w-4" />
                {t("ld_print", "Çap et")}
              </button>
            </div>
          </aside>
        </div>

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
                <WhatsappShareButton url={window.location.href} title={`${listing.title} - ${listing.pickupCity} -> ${listing.deliveryCity}`}>
                  <div className="flex flex-col items-center gap-2 transition hover:scale-110">
                    <WhatsappIcon size={48} round />
                    <span className="text-xs font-medium text-slate-600">WhatsApp</span>
                  </div>
                </WhatsappShareButton>

                <TelegramShareButton url={window.location.href} title={`${listing.title} - ${listing.pickupCity} -> ${listing.deliveryCity}`}>
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

                <TwitterShareButton url={window.location.href} title={`${listing.title} - ${listing.pickupCity} -> ${listing.deliveryCity}`}>
                  <div className="flex flex-col items-center gap-2 transition hover:scale-110">
                    <XIcon size={48} round />
                    <span className="text-xs font-medium text-slate-600">X (Twitter)</span>
                  </div>
                </TwitterShareButton>

                <LinkedinShareButton url={window.location.href} title={listing.title}>
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
      </section>
    </PublicPage>
  );
}
