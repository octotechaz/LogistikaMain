"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeftRight,
  Boxes,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  CircleEllipsis,
  Droplets,
  FilePlus2,
  LayoutGrid,
  List,
  MapPin,
  MessageCircleMore,
  OctagonAlert,
  Package2,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Snowflake,
  Truck,
  Users,
  LoaderCircle,
  Wheat
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { FavoriteToggleButton } from "@/components/classifieds/FavoriteToggleButton";
import { useFavoriteListings } from "@/hooks/useFavoriteListings";
import { ListingCoverMedia } from "@/components/classifieds/ListingCoverMedia";
import { PublicPage } from "@/components/classifieds/shared";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  formatDimensions,
  formatQuantity,
  formatVolume,
  resolveVolumeValue
} from "@/lib/cargo-measurements";
import {
  applyListingFilters,
  createEmptyFilters,
  formatListingDate,
  formatListingDateTimeShort,
  formatPriceCompact,
  formatWeight,
  getPublicListings
} from "@/lib/classifieds-format";
import { classifiedsCargoTypes, classifiedsCities, classifiedsVehicleTypes } from "@/lib/classifieds-meta";
// Dynamic filter options loaded from API (admin editable), fallback to static defaults
import { resolveCategoryIcon } from "@/lib/category-icons";
import { effectiveStatus } from "@/lib/status/classifieds";
import { getListingPhotoUrl, listingVisualTone } from "@/lib/listing-visual";
import { cn } from "@/lib/utils";
import { fetchJsonWithRetry } from "@/lib/fetch-json";
import type { CargoListing, ListingFilters, PublicListingCategory } from "@/types/classifieds";
import { useLocale } from "@/hooks/useLocale";

type CatalogMode = "home" | "loads";
type SortMode = "newest" | "price-desc" | "price-asc" | "weight-desc";

type ChipConfig = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  cargoType?: string;
  vehicleType?: string;
  keyword?: string;
};

type HomeCategoryView = PublicListingCategory & {
  icon: React.ComponentType<{ className?: string }>;
};

type InfiniteChunkOptions<T> = {
  items: T[];
  enabled: boolean;
  initialCount: number;
  chunkSize: number;
  loadingDelay?: number;
};

const CHIP_KEYS = [
  { key: "all", tKey: "catalog_chip_all", icon: Boxes },
  { key: "general", tKey: "catalog_chip_general", icon: Truck, keyword: "ümumi" },
  { key: "construction", tKey: "catalog_chip_construction", icon: Building2, cargoType: "Tikinti materialı" },
  { key: "food", tKey: "catalog_chip_food", icon: Package2, cargoType: "Ərzaq" },
  { key: "agri", tKey: "catalog_chip_agri", icon: Wheat, keyword: "taxıl" },
  { key: "liquid", tKey: "catalog_chip_liquid", icon: Droplets, keyword: "maye" },
  { key: "cold", tKey: "catalog_chip_cold", icon: Snowflake, vehicleType: "Soyuduculu maşın" },
  { key: "danger", tKey: "catalog_chip_danger", icon: OctagonAlert, keyword: "təhlükəli" },
  { key: "other", tKey: "catalog_chip_other", icon: CircleEllipsis },
] as const;

const SORT_KEYS = [
  { value: "newest" as SortMode, tKey: "catalog_sort_newest" },
  { value: "price-desc" as SortMode, tKey: "catalog_sort_price_desc" },
  { value: "price-asc" as SortMode, tKey: "catalog_sort_price_asc" },
  { value: "weight-desc" as SortMode, tKey: "catalog_sort_weight_desc" },
] as const;

const HOW_IT_WORKS_ICONS = [FilePlus2, Users, Truck] as const;

const fallbackHomeCategories: PublicListingCategory[] = [
  { id: "all", label: "All", iconKey: "grid", iconTone: "text-logistics-orange", sortOrder: 10, isActive: true }
];

const categoryToneClassNames: Record<string, { text: string; border: string; bg: string }> = {
  "text-logistics-orange": {
    text: "text-logistics-orange",
    border: "border-logistics-orange",
    bg: "bg-orange-50"
  },
  "text-slate-500": {
    text: "text-slate-500",
    border: "border-slate-300",
    bg: "bg-slate-50"
  },
  "text-blue-500": {
    text: "text-blue-600",
    border: "border-blue-300",
    bg: "bg-blue-50"
  },
  "text-green-500": {
    text: "text-emerald-600",
    border: "border-emerald-300",
    bg: "bg-emerald-50"
  },
  "text-orange-500": {
    text: "text-orange-600",
    border: "border-orange-300",
    bg: "bg-orange-50"
  },
  "text-purple-500": {
    text: "text-violet-600",
    border: "border-violet-300",
    bg: "bg-violet-50"
  },
  "text-red-500": {
    text: "text-red-600",
    border: "border-red-300",
    bg: "bg-red-50"
  },
  // Eski renk yedekleri
  "text-lime-600": {
    text: "text-lime-600",
    border: "border-lime-300",
    bg: "bg-lime-50"
  },
  "text-sky-600": {
    text: "text-sky-600",
    border: "border-sky-300",
    bg: "bg-sky-50"
  },
  "text-amber-600": {
    text: "text-amber-600",
    border: "border-amber-300",
    bg: "bg-amber-50"
  },
  "text-cyan-600": {
    text: "text-cyan-600",
    border: "border-cyan-300",
    bg: "bg-cyan-50"
  },
  "text-violet-600": {
    text: "text-violet-600",
    border: "border-violet-300",
    bg: "bg-violet-50"
  },
  "text-yellow-700": {
    text: "text-yellow-700",
    border: "border-yellow-300",
    bg: "bg-yellow-50"
  }
};

function getCategoryTone(iconTone: string) {
  return categoryToneClassNames[iconTone] ?? categoryToneClassNames["text-logistics-orange"];
}

function norm(s?: string | null) {
  return (s ?? "").trim().toLocaleLowerCase("az").replace(/[ı]/g, "i");
}

function categoryMatchesListing(category: PublicListingCategory, listing: CargoListing) {
  if (category.id === "all") {
    return true;
  }

  if (category.matchCargoType && norm(listing.cargoType) !== norm(category.matchCargoType)) {
    return false;
  }

  if (category.matchVehicleType && norm(listing.vehicleType) !== norm(category.matchVehicleType)) {
    return false;
  }

  if (category.matchKeyword) {
    const haystack = `${listing.title} ${listing.cargoType} ${listing.description} ${listing.vehicleType || ""}`.toLocaleLowerCase("az");
    const keywords = category.matchKeyword
      .split(",")
      .map((keyword) => keyword.trim().toLocaleLowerCase("az"))
      .filter(Boolean);

    if (keywords.length > 0 && !keywords.some((keyword) => haystack.includes(keyword))) {
      return false;
    }
  }

  return true;
}

const HOME_GRID_INITIAL_COUNT = 8;
const HOME_GRID_CHUNK_SIZE = 8;
const HOME_LIST_INITIAL_COUNT = 6;
const HOME_LIST_CHUNK_SIZE = 6;
const LOADS_INITIAL_COUNT = 10;
const LOADS_CHUNK_SIZE = 10;

function buildSearchHref(pathname: string, filters: ListingFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return `${pathname}${params.size ? `?${params.toString()}` : ""}`;
}

function priceNumber(value?: number | string) {
  if (value === undefined || value === null || value === "") {
    return Number.NaN;
  }

  return typeof value === "string" ? Number(value) : value;
}

function listingDimensions(listing: CargoListing) {
  return formatDimensions(listing.length, listing.width, listing.height);
}

function listingVolume(listing: CargoListing) {
  const value = resolveVolumeValue(
    listing.volume,
    listing.length,
    listing.width,
    listing.height
  );

  return value !== null ? `${formatVolume(value)} m³` : "";
}

function listingQuantity(listing: CargoListing) {
  return formatQuantity(listing.quantity);
}

function listingDateWindow(listing: CargoListing) {
  const baseDate =
    listing.pickupDeadlineDate || listing.pickupDate || listing.createdAt;
  const dateLabel = formatListingDate(baseDate);

  if (listing.pickupTime) {
    return `${dateLabel} • ${listing.pickupTime}`;
  }

  return dateLabel;
}

function sortListings(listings: CargoListing[], sortBy: SortMode) {
  const next = [...listings];

  if (sortBy === "price-desc") {
    next.sort((left, right) => {
      const a = priceNumber(left.price);
      const b = priceNumber(right.price);
      return (Number.isNaN(b) ? -1 : b) - (Number.isNaN(a) ? -1 : a);
    });
    return next;
  }

  if (sortBy === "price-asc") {
    next.sort((left, right) => {
      const a = priceNumber(left.price);
      const b = priceNumber(right.price);
      return (Number.isNaN(a) ? Number.MAX_SAFE_INTEGER : a) - (Number.isNaN(b) ? Number.MAX_SAFE_INTEGER : b);
    });
    return next;
  }

  if (sortBy === "weight-desc") {
    next.sort((left, right) => Number(right.weight || 0) - Number(left.weight || 0));
    return next;
  }

  next.sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt));
  return next;
}

function useInfiniteChunk<T>({
  items,
  enabled,
  initialCount,
  chunkSize,
  loadingDelay = 180
}: InfiniteChunkOptions<T>) {
  const [visibleCount, setVisibleCount] = useState(() => (enabled ? Math.min(initialCount, items.length) : items.length));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(enabled ? Math.min(initialCount, items.length) : items.length);
    setIsLoadingMore(false);

    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, [enabled, initialCount, items]);

  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  const hasMore = enabled && visibleCount < items.length;

  const loadMore = useCallback(() => {
    if (!enabled || isLoadingMore || visibleCount >= items.length) {
      return;
    }

    setIsLoadingMore(true);
    loadTimeoutRef.current = setTimeout(() => {
      setVisibleCount((current) => Math.min(current + chunkSize, items.length));
      setIsLoadingMore(false);
      loadTimeoutRef.current = null;
    }, loadingDelay);
  }, [chunkSize, enabled, isLoadingMore, items.length, loadingDelay, visibleCount]);

  useEffect(() => {
    if (!enabled || !hasMore || !sentinelRef.current) {
      return;
    }

    const sentinel = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      {
        rootMargin: "320px 0px"
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [enabled, hasMore, loadMore]);

  return {
    hasMore,
    isLoadingMore,
    loadedCount: enabled ? Math.min(visibleCount, items.length) : items.length,
    sentinelRef,
    visibleItems: enabled ? items.slice(0, visibleCount) : items
  };
}

function CatalogFilterField({
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col">{children}</label>
  );
}

function CatalogSelectCard({
  label,
  value,
  onChange,
  options,
  className,
  placeholder,
  variant = "flat"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  className?: string;
  placeholder?: string;
  variant?: "flat" | "bordered";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedLabel = value || placeholder || "Seçin";

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function selectOption(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  const isBordered = variant === "bordered";

  return (
    <div ref={rootRef} className={cn("relative h-[58px] min-w-0 shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative flex h-full w-full min-w-0 items-center justify-between rounded-[14px] px-4 py-2 text-left transition",
          isBordered
            ? "border border-slate-200 bg-white hover:border-slate-300 focus:border-slate-400"
            : "border border-transparent bg-[#F8F9FA] hover:bg-[#F2F4F7] focus:border-slate-300",
          open && (isBordered ? "border-slate-400 ring-2 ring-slate-100" : "bg-[#F1F3F5]")
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="flex flex-col items-start min-w-0 flex-1 pr-2">
          <span className="max-w-full truncate text-[11px] font-medium leading-tight text-slate-500">
            {label}
          </span>
          <span
            className={cn(
              "mt-0.5 block max-w-full truncate text-sm font-semibold leading-tight",
              value ? "text-neutral-900" : "text-slate-700"
            )}
          >
            {selectedLabel}
          </span>
        </div>
        {isBordered && (
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 transition duration-200" />
        )}
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-full max-w-[calc(100vw-2rem)] sm:max-w-[320px] max-h-60 overflow-y-auto rounded-[14px] border border-slate-200 bg-white p-1.5 shadow-xl [width:max-content]">
          <button
            type="button"
            onClick={() => selectOption("")}
            className={cn(
              "flex w-full items-start justify-between gap-3 px-3 py-3 text-left text-[13px] font-medium leading-[18px] transition hover:bg-slate-50",
              value === "" ? "bg-orange-50 text-logistics-orange" : "text-slate-600"
            )}
          >
            <span className="whitespace-normal break-words text-left">{placeholder || "Seçin"}</span>
            {value === "" ? <Check className="h-3.5 w-3.5" /> : null}
          </button>
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((option) => {
              const isSelected = option === value;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectOption(option)}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 px-3 py-3 text-left text-[13px] font-medium leading-[18px] transition hover:bg-slate-50",
                    isSelected ? "bg-orange-50 text-logistics-orange" : "text-slate-700"
                  )}
                >
                  <span className="pr-3 whitespace-normal break-words text-left">{option}</span>
                  {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CatalogInputCard({
  label,
  value,
  placeholder,
  onChange,
  type = "text",
  inputMode,
  className
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || value.length > 0;

  return (
    <div
      className={cn(
          "relative h-[60px] min-w-0 shrink-0 rounded-[13px] border bg-white px-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition duration-200 hover:-translate-y-px hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)]",
        focused ? "border-slate-400" : "border-slate-200 hover:border-slate-300"
        ,
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute left-4 origin-left text-[14px] font-semibold leading-none transition-all duration-200 ease-out",
          isFloating
            ? "top-[11px] scale-100 text-navy-900"
            : "top-1/2 -translate-y-1/2 scale-100 text-slate-500"
        )}
      >
        {label}
      </div>
      <input
        type={type}
        inputMode={inputMode}
        className={cn(
          "h-full w-full bg-transparent pb-[11px] pt-[29px] text-[13px] font-medium leading-none text-slate-700 outline-none transition",
          isFloating ? "placeholder:text-slate-400" : "placeholder:text-transparent"
        )}
        placeholder={placeholder}
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function AdvancedFilterCell({
  label,
  value,
  placeholder,
  onChange,
  type = "text",
  inputMode
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="text-[0.88rem] font-semibold text-navy-900">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-[12px] border border-slate-200 bg-white px-3 text-[0.95rem] text-slate-700 outline-none transition duration-200 placeholder:text-slate-500 hover:border-slate-300 focus:border-slate-400"
      />
    </label>
  );
}

function CatalogChip({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-12 shrink-0 items-center gap-3 rounded-[15px] border px-4 text-sm font-semibold transition duration-200 hover:-translate-y-px hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)]",
        active
          ? "border-logistics-orange bg-orange-50 text-logistics-orange shadow-[0_10px_24px_rgba(249,115,22,0.12)]"
          : "border-slate-200 bg-white text-navy-900 hover:border-orange-200 hover:bg-orange-50/30"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function CatalogListingRow({ listing }: { listing: CargoListing }) {
  const tone = listingVisualTone(listing);
  const Icon = tone.icon;
  const { locale } = useLocale();
  const localizedTitle = (locale !== "az" && (listing.translations as Record<string, { title?: string }>)?.[locale]?.title) || listing.title;

  return (
    <Link
      href={`/loads/${listing.id}`}
      className="grid gap-4 px-5 py-[18px] transition duration-200 hover:bg-slate-50 sm:grid-cols-[128px,minmax(0,1fr),174px]"
    >
      <div className={cn("flex h-24 w-24 items-center justify-center rounded-2xl", tone.panel)}>
        <Icon className="h-11 w-11" />
      </div>

      <div className="min-w-0">
        <h3 className="truncate text-[1.22rem] font-bold leading-tight text-navy-900">{localizedTitle}</h3>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[1.02rem] font-medium text-slate-700">
          <span>{listing.pickupCity}</span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <span>{listing.deliveryCity}</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2 text-[0.96rem] text-slate-500">
          <span className="inline-flex items-center gap-2">
            <Truck className="h-4 w-4 text-slate-400" />
            {listing.cargoType}
          </span>
          <span className="inline-flex items-center gap-2">
            <Scale className="h-4 w-4 text-slate-400" />
            {formatWeight(listing.weight)}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 sm:items-end sm:text-right">
        <StatusBadge status={effectiveStatus(listing)} />
        <div>
          <p className="text-[1.02rem] font-bold text-navy-900 sm:text-[1.12rem]">{formatPriceCompact(listing.price)}</p>
          <p className="text-[0.92rem] text-slate-500">/ ümumi</p>
        </div>
        <p className="text-[0.94rem] text-slate-500">{formatListingDateTimeShort(listing.createdAt)}</p>
      </div>
    </Link>
  );
}

function CatalogListingRowSkeleton() {
  return (
    <div className="grid animate-pulse gap-4 px-5 py-[18px] sm:grid-cols-[128px,minmax(0,1fr),174px]">
      <div className="h-24 w-24 rounded-2xl bg-slate-100" />
      <div className="space-y-3">
        <div className="h-6 w-2/3 rounded-full bg-slate-100" />
        <div className="h-4 w-1/2 rounded-full bg-slate-100" />
        <div className="flex flex-wrap gap-3 pt-1">
          <div className="h-4 w-28 rounded-full bg-slate-100" />
          <div className="h-4 w-20 rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="flex flex-col items-start gap-3 sm:items-end">
        <div className="h-7 w-20 rounded-full bg-slate-100" />
        <div className="h-6 w-24 rounded-full bg-slate-100" />
        <div className="h-4 w-20 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

function HomeCategoryButton({
  label,
  active,
  icon: Icon,
  iconTone,
  onClick
}: {
  label: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  iconTone: string;
  onClick: () => void;
}) {
  const activeTone = getCategoryTone(iconTone);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center sm:w-[80px] sm:gap-2"
      aria-pressed={active}
    >
      <span
        className={cn(
          "flex h-[56px] w-[56px] items-center justify-center rounded-[18px] border transition duration-200 ease-out sm:h-[56px] sm:w-[56px]",
          active
            ? `${activeTone.border} ${activeTone.bg} ${activeTone.text}`
            : "border-slate-200 bg-white text-slate-500 group-hover:border-slate-300 group-hover:bg-slate-50"
        )}
      >
        <Icon className={cn("h-6 w-6 transition-colors duration-200", active ? activeTone.text : "text-slate-500")} />
      </span>
      <span className={cn("w-full truncate text-[0.72rem] font-semibold leading-tight transition-colors duration-200 sm:text-[0.78rem]", active ? activeTone.text : "text-slate-500")} title={label}>{label}</span>
    </button>
  );
}

function HomeListingCard({ listing }: { listing: CargoListing }) {
  const quantityLabel = listingQuantity(listing);
  const volumeLabel = listingVolume(listing);
  const dimensionsLabel = listingDimensions(listing);
  const { t, locale } = useLocale();
  const localizedTitle = (locale !== "az" && (listing.translations as Record<string, { title?: string }>)?.[locale]?.title) || listing.title;

  return (
    <Link
      href={`/loads/${listing.id}`}
      className="group overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_36px_rgba(15,23,42,0.09)]"
    >
      <div className="relative aspect-[1/0.84] bg-[#f5f7fb]">
        <ListingCoverMedia
          listing={listing}
          imageClassName="h-full w-full object-cover transition duration-300 group-hover:scale-[1.035]"
          placeholderClassName="h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/12 via-transparent to-transparent" />
        <div className="absolute right-3 top-3 z-10 flex items-start justify-end">
          <FavoriteToggleButton
            listingId={listing.id}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/92 text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.10)] backdrop-blur-sm transition duration-200 hover:bg-white"
            iconClassName="h-[18px] w-[18px] stroke-[2.1]"
          />
        </div>
      </div>
      <div className="px-4 pb-4 pt-3.5">
        <p className="text-[17px] font-bold leading-none tracking-[-0.01em] text-logistics-orange">{formatPriceCompact(listing.price)}</p>
        <h3 className="mt-2 line-clamp-2 min-h-[2.5em] text-[16px] font-semibold leading-[1.24] text-[#171717]">
          {localizedTitle}
        </h3>
        <p className="mt-1 text-[12.5px] font-medium text-slate-400">{listing.cargoType}</p>
        <div className="mt-2 space-y-1 text-[12.5px] font-medium text-slate-500">
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {listing.pickupCity} - {listing.deliveryCity}
          </p>
          <p className="flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {listingDateWindow(listing)}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2.5 text-[12px] leading-[1.28]">
          {quantityLabel ? (
            <div>
              <p className="text-slate-400">{t("catalog_metric_qty", "Say")}</p>
              <p className="mt-0.5 font-semibold text-navy-900">{quantityLabel}</p>
            </div>
          ) : null}
          {volumeLabel ? (
            <div>
              <p className="text-slate-400">{t("catalog_metric_volume", "Həcm")}</p>
              <p className="mt-0.5 font-semibold text-navy-900">{volumeLabel}</p>
            </div>
          ) : null}
          <div>
            <p className="text-slate-400">{t("catalog_metric_weight", "Çəki")}</p>
            <p className="mt-0.5 font-semibold text-navy-900">{formatWeight(listing.weight)}</p>
          </div>
          {dimensionsLabel ? (
            <div className="col-span-2">
              <p className="text-slate-400">{t("catalog_metric_dims", "Ölçü")}</p>
              <p className="mt-0.5 font-semibold text-navy-900">{dimensionsLabel}</p>
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function SkeletonLine({ className }: { className: string }) {
  return <span className={cn("block rounded-full skeleton-shimmer", className)} />;
}

function HomeListingCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
      style={{ "--skeleton-delay": `${index * 90}ms` } as CSSProperties}
    >
      <div className="relative aspect-[1/0.84] bg-[#f7f9fc]">
        <div className="absolute inset-0 skeleton-shimmer" />
        <div className="absolute right-3 top-3 h-9 w-9 rounded-full bg-white/80 shadow-[0_8px_18px_rgba(15,23,42,0.08)]" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/70 to-transparent" />
      </div>
      <div className="px-4 pb-4 pt-3.5">
        <SkeletonLine className="h-5 w-24" />
        <div className="mt-3 space-y-2">
          <SkeletonLine className="h-4.5 w-[86%]" />
          <SkeletonLine className="h-4.5 w-[68%]" />
          <SkeletonLine className="h-3.5 w-32" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonLine className="h-3.5 w-3.5" />
            <SkeletonLine className="h-3.5 w-36" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonLine className="h-3.5 w-3.5" />
            <SkeletonLine className="h-3.5 w-28" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-2.5">
          {Array.from({ length: 4 }).map((_, metricIndex) => (
            <div key={metricIndex} className={metricIndex === 3 ? "col-span-2" : ""}>
              <SkeletonLine className="h-3 w-10" />
              <SkeletonLine className="mt-1.5 h-3.5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomeListingRow({ listing }: { listing: CargoListing }) {
  const quantityLabel = listingQuantity(listing);
  const volumeLabel = listingVolume(listing);
  const dimensionsLabel = listingDimensions(listing);
  const { t, locale } = useLocale();
  const localizedTitle = (locale !== "az" && (listing.translations as Record<string, { title?: string }>)?.[locale]?.title) || listing.title;

  return (
    <Link
      href={`/loads/${listing.id}`}
      className="grid gap-4 rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_6px_18px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] sm:grid-cols-[192px,minmax(0,1fr),120px]"
    >
      <div className="relative overflow-hidden rounded-[14px] bg-slate-100">
        <ListingCoverMedia
          listing={listing}
          imageClassName="h-[142px] w-full object-cover transition duration-300 group-hover:scale-[1.03] sm:h-full"
          placeholderClassName="h-[142px] w-full sm:h-full"
          placeholderIconClassName="h-12 w-12"
        />
      </div>

      <div className="min-w-0 py-0.5">
        <h3 className="line-clamp-2 text-[1.03rem] font-semibold leading-[1.24] text-navy-900">{localizedTitle}</h3>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[0.93rem] font-medium text-slate-700">
          <span>{listing.pickupCity}</span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <span>{listing.deliveryCity}</span>
        </p>
        <p className="mt-2 text-[0.84rem] text-slate-500">{listingDateWindow(listing)}</p>
        <div className="mt-2.5 grid gap-x-4 gap-y-1.5 text-[0.84rem] text-slate-500 sm:grid-cols-2">
          <span className="inline-flex items-center gap-2">
            <Truck className="h-4 w-4 text-slate-400" />
            {listing.cargoType}
          </span>
          <span className="inline-flex items-center gap-2">
            <Scale className="h-4 w-4 text-slate-400" />
            {formatWeight(listing.weight)}
          </span>
          {quantityLabel ? (
            <span>
              <span className="text-slate-400">{t("catalog_metric_qty", "Say")}:</span>{" "}
              <span className="font-medium text-navy-900">{quantityLabel}</span>
            </span>
          ) : null}
          {volumeLabel ? (
            <span>
              <span className="text-slate-400">{t("catalog_metric_volume", "Həcm")}:</span>{" "}
              <span className="font-medium text-navy-900">{volumeLabel}</span>
            </span>
          ) : null}
          {dimensionsLabel ? (
            <span className={cn(quantityLabel || volumeLabel ? "" : "sm:col-span-2")}>
              <span className="text-slate-400">{t("catalog_metric_dims", "Ölçü")}:</span>{" "}
              <span className="font-medium text-navy-900">{dimensionsLabel}</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 sm:flex-col sm:items-end sm:justify-between sm:text-right">
        <FavoriteToggleButton
          listingId={listing.id}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition duration-200 hover:scale-[1.04] hover:border-slate-300"
          iconClassName="h-[18px] w-[18px] stroke-[2.1]"
        />
        <div>
          <p className="text-[1.05rem] font-bold tracking-[-0.01em] text-logistics-orange">{formatPriceCompact(listing.price)}</p>
          <p className="mt-2 text-[0.85rem] text-slate-500">{formatListingDateTimeShort(listing.createdAt)}</p>
        </div>
      </div>
    </Link>
  );
}

function HomeListingExactRow({ listing }: { listing: CargoListing }) {
  const quantityLabel = listingQuantity(listing);
  const { t, locale } = useLocale();
  const { isFavorite, toggleFavorite } = useFavoriteListings();
  const favorite = isFavorite(listing.id);
  const localizedTitle = (locale !== "az" && (listing.translations as Record<string, { title?: string }>)?.[locale]?.title) || listing.title;

  const specs = [
    `${listing.pickupCity} - ${listing.deliveryCity}`,
    quantityLabel,
    formatWeight(listing.weight)
  ].filter(Boolean).join(" • ");

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 rounded-[20px] sm:rounded-[24px] bg-white p-4 sm:p-5 border border-slate-100 shadow-sm transition hover:shadow-md">
      <Link href={`/loads/${listing.id}`} className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 flex-1 min-w-0">
        <div className="relative h-[120px] sm:h-[100px] w-full sm:w-[160px] shrink-0 overflow-hidden rounded-[16px] bg-slate-100">
          <ListingCoverMedia
            listing={listing}
            imageClassName="h-full w-full object-cover transition duration-300 hover:scale-105"
            placeholderClassName="h-full w-full"
            placeholderIconClassName="h-10 w-10 text-slate-300"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="truncate text-lg sm:text-xl font-bold text-neutral-900">{localizedTitle}</h3>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 leading-relaxed">{specs}</p>
          <p className="mt-2 text-lg sm:text-xl font-extrabold text-neutral-900">
            {formatPriceCompact(listing.price)}
          </p>
        </div>
      </Link>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite(listing.id);
        }}
        className="w-full sm:w-auto rounded-[14px] bg-[#FEDE47] hover:bg-[#fdd835] px-6 sm:px-7 py-2.5 sm:py-3 text-sm font-bold text-neutral-900 transition shrink-0 whitespace-nowrap text-center shadow-none"
      >
        {favorite ? t("fav_in_favorites", "Seçilmişlərdə") : t("fav_add", "Seçilmişlərə əlavə et")}
      </button>
    </div>
  );
}

function FilterPopoverField({
  placeholder,
  displayValue,
  children,
  isOpen,
  onToggle,
  onClose
}: {
  placeholder: string;
  displayValue?: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "h-12 w-full rounded-[14px] border border-slate-200 bg-white px-4 text-left text-sm font-medium transition flex items-center justify-between",
          displayValue ? "text-neutral-900 border-slate-300" : "text-slate-400 hover:border-slate-300",
          isOpen && "border-slate-400 ring-2 ring-slate-100"
        )}
      >
        <span className="truncate">{displayValue || placeholder}</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-full min-w-[240px] rounded-[16px] border border-slate-200 bg-white p-3.5 shadow-xl">
          {children}
        </div>
      )}
    </div>
  );
}

function AllListingExactRow({ listing }: { listing: CargoListing }) {
  const quantityLabel = listingQuantity(listing);
  const { t, locale } = useLocale();
  const { isFavorite, toggleFavorite } = useFavoriteListings();
  const favorite = isFavorite(listing.id);
  const localizedTitle = (locale !== "az" && (listing.translations as Record<string, { title?: string }>)?.[locale]?.title) || listing.title;
  const photo = getListingPhotoUrl(listing);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 rounded-[20px] sm:rounded-[24px] bg-white p-4 sm:p-6 border border-slate-100 shadow-sm transition hover:shadow-md">
      <Link href={`/loads/${listing.id}`} className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-1 min-w-0">
        <div className="relative h-[120px] sm:h-[110px] w-full sm:w-[110px] shrink-0 overflow-hidden rounded-[16px] sm:rounded-[20px] bg-[#FDF0A6] flex items-center justify-center">
          {photo ? (
            <img
              src={photo}
              alt={listing.title}
              className="h-full w-full object-cover rounded-[16px] sm:rounded-[20px]"
              loading="lazy"
            />
          ) : (
            <span className="text-xl font-extrabold tracking-widest text-neutral-900">YÜK</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="truncate text-xl sm:text-2xl font-bold text-neutral-900 leading-snug">{localizedTitle}</h3>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
            <span>{listing.cargoType || t("cargo_type_general", "Ərzaq")}</span>
            <span className="text-slate-300">|</span>
            <span>{listing.pickupCity} - {listing.deliveryCity}</span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium text-slate-600">
            {quantityLabel ? <span>{quantityLabel}</span> : null}
            {listing.volume ? <span>{listing.volume} m3</span> : null}
            {listing.weight ? <span>{formatWeight(listing.weight)}</span> : null}
          </div>

          {(listing.length || listing.width || listing.height) ? (
            <div className="mt-1 text-xs sm:text-sm font-medium text-slate-600">
              Ölçü: {listing.length || 0} × {listing.width || 0} × {listing.height || 0} m
            </div>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-col sm:items-end justify-center shrink-0 pt-3 sm:pt-0 border-t border-slate-100 sm:border-t-0">
        <p className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
          {formatPriceCompact(listing.price)}
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(listing.id);
          }}
          className="mt-2.5 sm:mt-3 w-full sm:w-auto rounded-[14px] bg-[#FEDE47] hover:bg-[#fdd835] px-6 py-2.5 text-sm font-bold text-neutral-900 transition shrink-0 whitespace-nowrap shadow-none text-center"
        >
          {favorite ? t("fav_in_favorites", "Seçilmişlərdə") : t("fav_add", "Seçilmişlərə əlavə et")}
        </button>
      </div>
    </div>
  );
}

export function CatalogPageClient({
  mode,
  initialListings = [],
}: {
  mode: CatalogMode;
  initialListings?: CargoListing[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useLocale();

  const chipConfigs = useMemo<ChipConfig[]>(() => CHIP_KEYS.map((c) => ({
    key: c.key,
    label: t(c.tKey, c.tKey),
    icon: c.icon,
    cargoType: "cargoType" in c ? c.cargoType : undefined,
    vehicleType: "vehicleType" in c ? c.vehicleType : undefined,
    keyword: "keyword" in c ? c.keyword : undefined,
  })), [t]);

  const sortOptions = useMemo(() => SORT_KEYS.map((s) => ({
    value: s.value,
    label: t(s.tKey, s.tKey),
  })), [t]);

  const howItWorksSteps = useMemo(() => [
    { number: "1", title: t("catalog_hiw_1_title", "Elan yerləşdirin"), text: t("catalog_hiw_1_text", "Yük məlumatlarınızı daxil edin və pulsuz elan yerləşdirin."), icon: HOW_IT_WORKS_ICONS[0] },
    { number: "2", title: t("catalog_hiw_2_title", "Təklifləri alın"), text: t("catalog_hiw_2_text", "Daşıyıcılar sizin elanınızı görəcək və əlaqə saxlayacaqlar."), icon: HOW_IT_WORKS_ICONS[1] },
    { number: "3", title: t("catalog_hiw_3_title", "Yükünüzü çatdırın"), text: t("catalog_hiw_3_text", "Ən uyğun daşıyıcını seçin və yükünüzü təhlükəsiz çatdırın."), icon: HOW_IT_WORKS_ICONS[2] },
  ], [t]);

  const [sqliteListings, setSqliteListings] = useState<CargoListing[]>(initialListings);
  const [isDataLoaded, setIsDataLoaded] = useState(initialListings.length > 0);
  const [homeCategories, setHomeCategories] = useState<PublicListingCategory[]>(fallbackHomeCategories);
  const [dynCities, setDynCities] = useState<string[]>(classifiedsCities);
  const [dynCargoTypes, setDynCargoTypes] = useState<string[]>(classifiedsCargoTypes);
  const [dynVehicleTypes, setDynVehicleTypes] = useState<string[]>(classifiedsVehicleTypes);
  const [filters, setFilters] = useState(createEmptyFilters());
  const [draftFilters, setDraftFilters] = useState(createEmptyFilters());
  const [sortBy, setSortBy] = useState<SortMode>("newest");
  const [homeCategory, setHomeCategory] = useState("all");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [showAllHomeListings, setShowAllHomeListings] = useState(() => searchParams.get("view") === "all");
  const [homeView, setHomeView] = useState<"grid" | "list">(() => {
    const layout = searchParams.get("layout");
    return layout === "grid" ? "grid" : "list";
  });
  const [activeSidebarPopover, setActiveSidebarPopover] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const initialListingsRef = useRef(initialListings);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPublicData() {
      const [listingsPayload, categoriesPayload, filtersPayload] = await Promise.all([
        fetchJsonWithRetry<{ data?: CargoListing[] }>("/api/public/listings"),
        fetchJsonWithRetry<{ data?: PublicListingCategory[] }>("/api/public/categories"),
        fetch("/api/public/filters").then((r) => r.ok ? r.json() : null).catch(() => null),
      ]);

      if (cancelled) {
        return;
      }

      const nextListings = Array.isArray(listingsPayload?.data) ? listingsPayload.data : null;
      const nextCategories = Array.isArray(categoriesPayload?.data) ? categoriesPayload.data : null;

      if (nextListings) {
        setSqliteListings(nextListings);
        setLoadError(null);
      } else if (initialListingsRef.current.length > 0) {
        setSqliteListings(initialListingsRef.current);
        setLoadError(null);
      } else {
        setSqliteListings([]);
        setLoadError(t("catalog_load_error", "Elanlar yüklənmədi. Zəhmət olmasa yenidən cəhd edin."));
      }

      if (nextCategories && nextCategories.length > 0) {
        setHomeCategories(nextCategories);
      }

      if (filtersPayload?.cities?.length) setDynCities(filtersPayload.cities);
      if (filtersPayload?.cargoTypes?.length) setDynCargoTypes(filtersPayload.cargoTypes);
      if (filtersPayload?.vehicleTypes?.length) setDynVehicleTypes(filtersPayload.vehicleTypes);

      setIsDataLoaded(true);
    }

    loadPublicData();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  useEffect(() => {
    if (mode === "home") {
      setShowAllHomeListings(searchParams.get("view") === "all");
      setShowAdvancedFilters(searchParams.get("advanced") === "1");
      const nextHomeView = searchParams.get("layout");
      if (nextHomeView === "grid" || nextHomeView === "list") {
        setHomeView(nextHomeView);
      }
      return;
    }

    if (mode !== "loads") {
      return;
    }

    const next = createEmptyFilters();
    searchParams.forEach((value, key) => {
      if (key in next) {
        next[key as keyof ListingFilters] = value;
      }
    });
    setFilters(next);
    setDraftFilters(next);
  }, [mode, searchParams]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (mode !== "home") {
      return;
    }

    setCategoryLoading(true);
    const timeout = window.setTimeout(() => {
      setCategoryLoading(false);
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [homeCategory, mode]);

  const publicListings = useMemo(() => getPublicListings(sqliteListings), [sqliteListings]);
  const homeCategoryViews = useMemo<HomeCategoryView[]>(
    () => {
      const allCategory: HomeCategoryView = {
        ...fallbackHomeCategories[0],
        label: t("catalog_all", "Hamısı"),
        icon: resolveCategoryIcon("grid"),
      };

      const apiCategories = homeCategories
        .filter((category) => category.id !== "all")
        .map((category) => ({
          ...category,
          label: (locale !== "az" && (category as unknown as { labelTranslations?: Record<string, string> }).labelTranslations?.[locale]) || (locale !== "az" && t(`catalog_chip_${category.id}`, "")) || category.label,
          icon: resolveCategoryIcon(category.iconKey),
        }));

      return [allCategory, ...apiCategories];
    },
    [homeCategories, locale, t]
  );

  const selectedHomeCategory = useMemo(
    () => homeCategoryViews.find((item) => item.id === homeCategory) ?? homeCategoryViews[0],
    [homeCategory, homeCategoryViews]
  );
  const categoryMatchedHomeListings = useMemo(() => {
    if (!selectedHomeCategory || selectedHomeCategory.id === "all") {
      return publicListings;
    }

    return publicListings.filter((listing) => categoryMatchesListing(selectedHomeCategory, listing));
  }, [publicListings, selectedHomeCategory]);
  const homeListings = useMemo(
    () => applyListingFilters(categoryMatchedHomeListings, filters),
    [categoryMatchedHomeListings, filters]
  );
  const latestHomeListings = useMemo(() => {
    return homeListings.slice(0, 4);
  }, [homeListings]);
  const hasHomeListings = latestHomeListings.length > 0;
  const filteredListings = useMemo(() => applyListingFilters(publicListings, filters), [filters, publicListings]);
  const sortedListings = useMemo(() => sortListings(filteredListings, sortBy), [filteredListings, sortBy]);
  const hasActiveFilters = useMemo(() => Object.values(filters).some(Boolean), [filters]);
  const homeInfiniteConfig = homeView === "grid"
    ? { initialCount: HOME_GRID_INITIAL_COUNT, chunkSize: HOME_GRID_CHUNK_SIZE }
    : { initialCount: HOME_LIST_INITIAL_COUNT, chunkSize: HOME_LIST_CHUNK_SIZE };
  const homeInfinite = useInfiniteChunk({
    items: homeListings,
    enabled: mode === "home" && showAllHomeListings,
    initialCount: homeInfiniteConfig.initialCount,
    chunkSize: homeInfiniteConfig.chunkSize
  });
  const loadsInfinite = useInfiniteChunk({
    items: sortedListings,
    enabled: mode === "loads",
    initialCount: LOADS_INITIAL_COUNT,
    chunkSize: LOADS_CHUNK_SIZE
  });
  const resultsHeadline = hasActiveFilters
    ? new Intl.NumberFormat("az-AZ").format(sortedListings.length)
    : "1 248";

  const activeChip = useMemo(() => {
    const matched = chipConfigs.find((chip) => {
      if (chip.cargoType && filters.cargoType === chip.cargoType) {
        return true;
      }

      if (chip.vehicleType && filters.vehicleType === chip.vehicleType) {
        return true;
      }

      if (chip.keyword && filters.keyword.toLocaleLowerCase("az").includes(chip.keyword.toLocaleLowerCase("az"))) {
        return true;
      }

      return false;
    });

    return matched?.key || "all";
  }, [filters]);

  function updateFilter(name: keyof ListingFilters, value: string) {
    setDraftFilters((current) => ({ ...current, [name]: value }));
  }

  function applyCommittedFilters(nextFilters: ListingFilters) {
    setFilters(nextFilters);

    if (mode === "home") {
      setShowAllHomeListings(true);
      return;
    }

    router.push(buildSearchHref(pathname, nextFilters));
  }

  function submitFilters(nextFilters = draftFilters) {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const shouldShowLoading = publicListings.length > 24;

    if (!shouldShowLoading) {
      setIsSearching(false);
      applyCommittedFilters(nextFilters);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      applyCommittedFilters(nextFilters);
      setIsSearching(false);
      searchTimeoutRef.current = null;
    }, 240);
  }

  function clearFilters() {
    const next = createEmptyFilters();
    setFilters(next);
    setDraftFilters(next);
    setShowAdvancedFilters(false);
    setIsSearching(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    if (mode === "loads") {
      router.push(pathname);
    }
  }

  function applyChip(chip: ChipConfig) {
    const next = createEmptyFilters();

    if (chip.cargoType) {
      next.cargoType = chip.cargoType;
    }

    if (chip.vehicleType) {
      next.vehicleType = chip.vehicleType;
    }

    if (chip.keyword) {
      next.keyword = chip.keyword;
    }

    setDraftFilters(next);
    setFilters(next);
    if (mode === "home") {
      setShowAllHomeListings(true);
      return;
    }

    router.push(buildSearchHref(pathname, next));
  }

  const renderAllListingsSection = (isStandalone = false) => {
    const isHome = mode === "home" && !isStandalone;
    const itemsCount = isHome ? homeListings.length : sortedListings.length;
    const visibleItems = isHome ? homeInfinite.visibleItems : loadsInfinite.visibleItems;
    const isLoadingMore = isHome ? homeInfinite.isLoadingMore : loadsInfinite.isLoadingMore;
    const hasMore = isHome ? homeInfinite.hasMore : loadsInfinite.hasMore;
    const sentinelRef = isHome ? homeInfinite.sentinelRef : loadsInfinite.sentinelRef;

    return (
      <div id="all-listings-section" className={cn(isStandalone ? "" : "mt-12")}>
        <div className="mb-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1B0A33] tracking-tight">
            {t("catalog_all_listings", "Bütün elanlar")}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {t("catalog_search_results_view", "Axtarış nəticələrinə baxış")}
          </p>
        </div>

        {/* Top Filter Bar */}
        <div className="rounded-[24px] bg-white p-5 border border-slate-100 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_minmax(180px,auto)] items-center gap-4">
            <CatalogSelectCard
              variant="bordered"
              label={t("search_cargo_type", "Yük növü")}
              value={draftFilters.cargoType}
              onChange={(value) => updateFilter("cargoType", value)}
              options={dynCargoTypes}
              className="w-full"
              placeholder={t("catalog_select_placeholder", "Seçin")}
            />

            <CatalogSelectCard
              variant="bordered"
              label={t("search_delivery_city", "Çatdırılma şəhəri")}
              value={draftFilters.deliveryCity}
              onChange={(value) => updateFilter("deliveryCity", value)}
              options={dynCities}
              className="w-full"
              placeholder={t("catalog_select_placeholder", "Seçin")}
            />

            <CatalogSelectCard
              variant="bordered"
              label={t("search_vehicle_type", "Nəqliyyat növü")}
              value={draftFilters.vehicleType}
              onChange={(value) => updateFilter("vehicleType", value)}
              options={dynVehicleTypes}
              className="w-full"
              placeholder={t("catalog_select_placeholder", "Seçin")}
            />

            <button
              type="button"
              onClick={() => submitFilters()}
              disabled={isSearching}
              className="h-[58px] px-12 rounded-[14px] bg-[#FEDE47] hover:bg-[#fdd835] text-neutral-900 font-bold text-base transition flex items-center justify-center whitespace-nowrap shadow-none disabled:opacity-50"
            >
              {isSearching ? <LoaderCircle className="h-4.5 w-4.5 animate-spin" /> : null}
              {isSearching ? t("search_btn_loading", "Axtarılır...") : t("search_btn", "Axtar")}
            </button>
          </div>
        </div>

        {/* Two Column Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 sm:gap-8 items-start">
          {/* Left Sidebar */}
          <div className="rounded-[24px] bg-white p-6 border border-slate-100 shadow-sm space-y-3.5">
            <h3 className="text-xl font-bold text-neutral-900 mb-5">
              {t("search_advanced_btn", "Ətraflı filter")}
            </h3>

            {/* 1. Min qiymət */}
            <input
              type="number"
              placeholder="Min qiymət (AZN)"
              value={draftFilters.minPrice}
              onChange={(e) => updateFilter("minPrice", e.target.value)}
              className="h-12 w-full rounded-[14px] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-400 transition"
            />

            {/* 2. Max qiymət */}
            <input
              type="number"
              placeholder="Max qiymət (AZN)"
              value={draftFilters.maxPrice}
              onChange={(e) => updateFilter("maxPrice", e.target.value)}
              className="h-12 w-full rounded-[14px] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-400 transition"
            />

            {/* 3. Min çəki / Max çəki */}
            <FilterPopoverField
              placeholder="Min çəki / Max çəki"
              displayValue={
                draftFilters.minWeight || draftFilters.maxWeight
                  ? `${draftFilters.minWeight || "0"} - ${draftFilters.maxWeight || "∞"} kq`
                  : undefined
              }
              isOpen={activeSidebarPopover === "weight"}
              onToggle={() => setActiveSidebarPopover(activeSidebarPopover === "weight" ? null : "weight")}
              onClose={() => setActiveSidebarPopover(null)}
            >
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Min çəki (kq)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={draftFilters.minWeight}
                    onChange={(e) => updateFilter("minWeight", e.target.value)}
                    className="mt-1 h-9 w-full rounded-[10px] border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Max çəki (kq)</label>
                  <input
                    type="number"
                    placeholder="10000"
                    value={draftFilters.maxWeight}
                    onChange={(e) => updateFilter("maxWeight", e.target.value)}
                    className="mt-1 h-9 w-full rounded-[10px] border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </FilterPopoverField>

            {/* 4. Tarixdən / Tarixədək */}
            <FilterPopoverField
              placeholder="Tarixdən / Tarixədək"
              displayValue={
                draftFilters.dateFrom || draftFilters.dateTo
                  ? `${draftFilters.dateFrom || "..."} - ${draftFilters.dateTo || "..."}`
                  : undefined
              }
              isOpen={activeSidebarPopover === "date"}
              onToggle={() => setActiveSidebarPopover(activeSidebarPopover === "date" ? null : "date")}
              onClose={() => setActiveSidebarPopover(null)}
            >
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Tarixdən</label>
                  <input
                    type="date"
                    value={draftFilters.dateFrom}
                    onChange={(e) => updateFilter("dateFrom", e.target.value)}
                    className="mt-1 h-9 w-full rounded-[10px] border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Tarixədək</label>
                  <input
                    type="date"
                    value={draftFilters.dateTo}
                    onChange={(e) => updateFilter("dateTo", e.target.value)}
                    className="mt-1 h-9 w-full rounded-[10px] border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </FilterPopoverField>

            {/* 5. Min həcm / Max həcm */}
            <FilterPopoverField
              placeholder="Min həcm / Max həcm"
              displayValue={
                draftFilters.minVolume || draftFilters.maxVolume
                  ? `${draftFilters.minVolume || "0"} - ${draftFilters.maxVolume || "∞"} m³`
                  : undefined
              }
              isOpen={activeSidebarPopover === "volume"}
              onToggle={() => setActiveSidebarPopover(activeSidebarPopover === "volume" ? null : "volume")}
              onClose={() => setActiveSidebarPopover(null)}
            >
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Min həcm (m³)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={draftFilters.minVolume}
                    onChange={(e) => updateFilter("minVolume", e.target.value)}
                    className="mt-1 h-9 w-full rounded-[10px] border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Max həcm (m³)</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={draftFilters.maxVolume}
                    onChange={(e) => updateFilter("maxVolume", e.target.value)}
                    className="mt-1 h-9 w-full rounded-[10px] border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </FilterPopoverField>

            {/* 6. Uzunluq / En / Hündürlük */}
            <FilterPopoverField
              placeholder="Uzunluq / En / Hündürlük"
              displayValue={
                draftFilters.length || draftFilters.width || draftFilters.height
                  ? `${draftFilters.length || "-"} × ${draftFilters.width || "-"} × ${draftFilters.height || "-"} m`
                  : undefined
              }
              isOpen={activeSidebarPopover === "dimensions"}
              onToggle={() => setActiveSidebarPopover(activeSidebarPopover === "dimensions" ? null : "dimensions")}
              onClose={() => setActiveSidebarPopover(null)}
            >
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Uzunluq (m)</label>
                  <input
                    type="number"
                    placeholder="məs: 13.6"
                    value={draftFilters.length}
                    onChange={(e) => updateFilter("length", e.target.value)}
                    className="mt-1 h-9 w-full rounded-[10px] border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">En (m)</label>
                  <input
                    type="number"
                    placeholder="məs: 2.45"
                    value={draftFilters.width}
                    onChange={(e) => updateFilter("width", e.target.value)}
                    className="mt-1 h-9 w-full rounded-[10px] border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Hündürlük (m)</label>
                  <input
                    type="number"
                    placeholder="məs: 2.7"
                    value={draftFilters.height}
                    onChange={(e) => updateFilter("height", e.target.value)}
                    className="mt-1 h-9 w-full rounded-[10px] border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </FilterPopoverField>

            {/* 7. Elan dili */}
            <div className="relative">
              <select
                value={draftFilters.listingLocale}
                onChange={(e) => updateFilter("listingLocale", e.target.value)}
                className={cn(
                  "h-12 w-full rounded-[14px] border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:border-slate-400 transition cursor-pointer appearance-none",
                  draftFilters.listingLocale ? "text-neutral-900" : "text-slate-400"
                )}
              >
                <option value="">Elan dili</option>
                <option value="az">Azərbaycan</option>
                <option value="ru">Русский</option>
                <option value="en">English</option>
                <option value="tr">Türkçe</option>
              </select>
            </div>
          </div>

          {/* Right Listings Area */}
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-800">
                {itemsCount} {t("catalog_listings_shown", "elan göstərilir")}
              </p>

              {/* View Toggle */}
              <div className="inline-flex items-center rounded-full bg-[#F3F4F6] p-1">
                <button
                  type="button"
                  onClick={() => setHomeView("grid")}
                  className={cn(
                    "rounded-full px-5 py-1.5 text-xs font-bold transition",
                    homeView === "grid"
                      ? "bg-[#FEDE47] text-neutral-900 shadow-none"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {t("catalog_grid", "Kvadratlar")}
                </button>
                <button
                  type="button"
                  onClick={() => setHomeView("list")}
                  className={cn(
                    "rounded-full px-5 py-1.5 text-xs font-bold transition",
                    homeView === "list"
                      ? "bg-[#FEDE47] text-neutral-900 shadow-none"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {t("catalog_list", "Siyahı")}
                </button>
              </div>
            </div>

            {homeView === "list" ? (
              <div className="space-y-4">
                {visibleItems.map((listing) => (
                  <AllListingExactRow key={`all-list-${listing.id}`} listing={listing} />
                ))}
                {isLoadingMore ? (
                  <div className="flex h-12 w-full items-center justify-center">
                    <LoaderCircle className="h-6 w-6 animate-spin text-logistics-orange" />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {visibleItems.map((listing) => (
                  <HomeListingCard key={`all-grid-${listing.id}`} listing={listing} />
                ))}
                {isLoadingMore ? (
                  <div className="flex h-12 w-full items-center justify-center">
                    <LoaderCircle className="h-6 w-6 animate-spin text-logistics-orange" />
                  </div>
                ) : null}
              </div>
            )}

            {hasMore && (
              <div ref={sentinelRef} className="h-8 w-full" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>
    );
  };

  if (mode === "home") {
    if (!isDataLoaded) {
      return (
        <PublicPage emphasizeBackground>
          <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4">
            <LoaderCircle className="h-10 w-10 animate-spin text-logistics-orange" />
            <p className="text-lg font-medium text-slate-500">{t("catalog_loading", "Məlumatlar yüklənir...")}</p>
          </div>
        </PublicPage>
      );
    }

    return (
      <PublicPage emphasizeBackground>
        <section className="mx-auto w-full max-w-[1280px] min-w-0 px-4 sm:px-[32px] pt-[16px] pb-[16px] flex flex-col gap-6">
          {loadError ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
            >
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => {
                  setLoadError(null);
                  setReloadToken((token) => token + 1);
                }}
                className="shrink-0 rounded-[10px] border border-red-300 bg-white px-4 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              >
                {t("catalog_retry", "Yenidən cəhd et")}
              </button>
            </div>
          ) : null}

          <section className="relative isolate w-full aspect-[2000/750] min-h-[135px] sm:aspect-auto sm:h-[324px] overflow-hidden rounded-[20px] sm:rounded-[28px] bg-[#2a0e44] px-4 py-3 xs:px-5 xs:py-4 sm:px-[56px] sm:pt-[56px] sm:pb-6 text-white shadow-lg shadow-purple-950/20 flex flex-col justify-center sm:justify-start">
            <img
              src="/images/tranzit-hero-banner.jpg"
              alt="Tranzit Banner"
              className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-[right_center] sm:object-[center_12%] select-none"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-[#210936]/80 via-[#210936]/40 to-transparent -z-10 sm:hidden" />
            <div className="w-full">
              <div className="flex flex-col items-start gap-1 sm:gap-4 max-w-[50%] xs:max-w-[52%] sm:max-w-[371px]">
                <h1 className="w-full text-[14px] xs:text-[17px] sm:text-[32px] md:text-[36px] font-extrabold leading-[18px] xs:leading-[22px] sm:leading-[40px] md:leading-[48px] tracking-[-0.02em] text-white drop-shadow-sm">
                  {t("home_hero_title", "Daşımalarınızı bizimlə asanlaşdırın")}
                </h1>
                <p className="hidden sm:block max-w-[371px] text-sm sm:text-base leading-5 sm:leading-6 text-white/80">
                  {t("home_hero_subtitle", "Yükünüz üçün doğru marşrutu, nəqliyyatı və daşıyıcını bir yerdə tapın.")}
                </p>
              </div>
            </div>
          </section>

          {/* Categories Pill Bar */}
          <div className="rounded-[24px] bg-white px-5 sm:px-6 py-4 border border-slate-100 shadow-sm flex items-center gap-3 overflow-x-auto no-scrollbar">
            <h2 className="text-base font-bold text-neutral-900 shrink-0 mr-2">
              {t("categories_title", "Kateqoriyalara baxın")}
            </h2>
            <div className="flex items-center gap-2.5 shrink-0">
              {homeCategoryViews.map((category) => {
                const active = homeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setHomeCategory(category.id)}
                    className={cn(
                      "rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-200 shrink-0 whitespace-nowrap",
                      active
                        ? "bg-[#FEDE47] text-neutral-900 font-bold shadow-none"
                        : "bg-[#F3F4F6] text-neutral-800 hover:bg-slate-200"
                    )}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Planner Card */}
          <div className="rounded-[24px] bg-white p-6 sm:p-8 border border-slate-100 shadow-sm">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8F6B00]">
                {t("search_eyebrow", "AXTARIŞ PLANI")}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
                {t("search_title", "Marşrutunuzu planlayın")}
              </h2>
            </div>

            <div className="mt-6">
              <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t("search_route_label", "YÜKLƏMƏ VƏ ÇATDIRILMA NÖQTƏLƏRİ")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1fr_1fr] items-center gap-3">
                <CatalogSelectCard
                  label={t("search_pickup_city", "Yükləmə şəhəri")}
                  value={draftFilters.pickupCity}
                  onChange={(value) => updateFilter("pickupCity", value)}
                  options={dynCities}
                  className="w-full"
                  placeholder={t("catalog_select_placeholder", "Seçin")}
                />

                <div className="hidden lg:flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setDraftFilters((current) => ({
                        ...current,
                        pickupCity: current.deliveryCity,
                        deliveryCity: current.pickupCity
                      }))
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F3F4F6] text-slate-600 transition hover:bg-slate-200 shrink-0"
                    aria-label="Marşrutu dəyiş"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </button>
                </div>

                <CatalogSelectCard
                  label={t("search_delivery_city", "Çatdırılma şəhəri")}
                  value={draftFilters.deliveryCity}
                  onChange={(value) => updateFilter("deliveryCity", value)}
                  options={dynCities}
                  className="w-full"
                  placeholder={t("catalog_select_placeholder", "Seçin")}
                />

                <CatalogSelectCard
                  label={t("search_cargo_type", "Yük növü")}
                  value={draftFilters.cargoType}
                  onChange={(value) => updateFilter("cargoType", value)}
                  options={dynCargoTypes}
                  className="w-full"
                  placeholder={t("catalog_select_placeholder", "Seçin")}
                />

                <CatalogSelectCard
                  label={t("search_vehicle_type", "Nəqliyyat növü")}
                  value={draftFilters.vehicleType}
                  onChange={(value) => updateFilter("vehicleType", value)}
                  options={dynVehicleTypes}
                  className="w-full"
                  placeholder={t("catalog_select_placeholder", "Seçin")}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] items-center gap-3">
              <input
                type="text"
                placeholder={t("search_keyword", "Açar söz")}
                value={draftFilters.keyword}
                onChange={(e) => updateFilter("keyword", e.target.value)}
                className="h-[52px] w-full rounded-[14px] bg-[#F8F9FA] px-4 text-sm text-neutral-900 placeholder:text-slate-400 outline-none border border-transparent focus:border-slate-300 transition"
              />

              <button
                type="button"
                onClick={() => setShowAdvancedFilters((current) => !current)}
                className={cn(
                  "inline-flex h-[52px] items-center justify-center gap-2 rounded-[14px] px-6 text-sm font-bold transition whitespace-nowrap",
                  showAdvancedFilters
                    ? "bg-slate-200 text-neutral-900"
                    : "bg-[#F3F4F6] text-neutral-800 hover:bg-slate-200"
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {t("search_advanced_btn", "Ətraflı filter")}
              </button>

              <button
                type="button"
                onClick={() => submitFilters()}
                disabled={isSearching}
                className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[#FEDE47] px-12 text-base font-bold text-neutral-900 transition hover:bg-[#fdd835] shadow-none disabled:opacity-50 whitespace-nowrap"
              >
                {isSearching ? <LoaderCircle className="h-4.5 w-4.5 animate-spin" /> : null}
                {isSearching ? t("search_btn_loading", "Axtarılır...") : t("search_btn", "Axtar")}
              </button>
            </div>

            {showAdvancedFilters && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <input
                  type="number"
                  placeholder="Min qiymət (AZN)"
                  value={draftFilters.minPrice}
                  onChange={(e) => updateFilter("minPrice", e.target.value)}
                  className="h-[46px] w-full rounded-[14px] bg-[#F8F9FA] px-3.5 text-xs font-medium text-neutral-800 placeholder:text-slate-400 outline-none border border-transparent focus:border-slate-300 transition"
                />
                <input
                  type="number"
                  placeholder="Max qiymət (AZN)"
                  value={draftFilters.maxPrice}
                  onChange={(e) => updateFilter("maxPrice", e.target.value)}
                  className="h-[46px] w-full rounded-[14px] bg-[#F8F9FA] px-3.5 text-xs font-medium text-neutral-800 placeholder:text-slate-400 outline-none border border-transparent focus:border-slate-300 transition"
                />
                <input
                  type="number"
                  placeholder="Min çəki (kq)"
                  value={draftFilters.minWeight}
                  onChange={(e) => updateFilter("minWeight", e.target.value)}
                  className="h-[46px] w-full rounded-[14px] bg-[#F8F9FA] px-3.5 text-xs font-medium text-neutral-800 placeholder:text-slate-400 outline-none border border-transparent focus:border-slate-300 transition"
                />
                <input
                  type="number"
                  placeholder="Max çəki (kq)"
                  value={draftFilters.maxWeight}
                  onChange={(e) => updateFilter("maxWeight", e.target.value)}
                  className="h-[46px] w-full rounded-[14px] bg-[#F8F9FA] px-3.5 text-xs font-medium text-neutral-800 placeholder:text-slate-400 outline-none border border-transparent focus:border-slate-300 transition"
                />
                <input
                  type="text"
                  onFocus={(e) => (e.target.type = "date")}
                  onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                  placeholder="Tarixdən"
                  value={draftFilters.dateFrom}
                  onChange={(e) => updateFilter("dateFrom", e.target.value)}
                  className="h-[46px] w-full rounded-[14px] bg-[#F8F9FA] px-3.5 text-xs font-medium text-neutral-800 placeholder:text-slate-400 outline-none border border-transparent focus:border-slate-300 transition"
                />
                <input
                  type="text"
                  onFocus={(e) => (e.target.type = "date")}
                  onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                  placeholder="Tarixədək"
                  value={draftFilters.dateTo}
                  onChange={(e) => updateFilter("dateTo", e.target.value)}
                  className="h-[46px] w-full rounded-[14px] bg-[#F8F9FA] px-3.5 text-xs font-medium text-neutral-800 placeholder:text-slate-400 outline-none border border-transparent focus:border-slate-300 transition"
                />
                <input
                  type="number"
                  placeholder="Min həcm (m³)"
                  value={draftFilters.minVolume}
                  onChange={(e) => updateFilter("minVolume", e.target.value)}
                  className="h-[46px] w-full rounded-[14px] bg-[#F8F9FA] px-3.5 text-xs font-medium text-neutral-800 placeholder:text-slate-400 outline-none border border-transparent focus:border-slate-300 transition"
                />
                <input
                  type="number"
                  placeholder="Max həcm (m³)"
                  value={draftFilters.maxVolume}
                  onChange={(e) => updateFilter("maxVolume", e.target.value)}
                  className="h-[46px] w-full rounded-[14px] bg-[#F8F9FA] px-3.5 text-xs font-medium text-neutral-800 placeholder:text-slate-400 outline-none border border-transparent focus:border-slate-300 transition"
                />
                <input
                  type="number"
                  placeholder="Uzunluq (m)"
                  value={draftFilters.length}
                  onChange={(e) => updateFilter("length", e.target.value)}
                  className="h-[46px] w-full rounded-[14px] bg-[#F8F9FA] px-3.5 text-xs font-medium text-neutral-800 placeholder:text-slate-400 outline-none border border-transparent focus:border-slate-300 transition"
                />
                <input
                  type="number"
                  placeholder="En (m)"
                  value={draftFilters.width}
                  onChange={(e) => updateFilter("width", e.target.value)}
                  className="h-[46px] w-full rounded-[14px] bg-[#F8F9FA] px-3.5 text-xs font-medium text-neutral-800 placeholder:text-slate-400 outline-none border border-transparent focus:border-slate-300 transition"
                />
                <input
                  type="number"
                  placeholder="Hündürlük (m)"
                  value={draftFilters.height}
                  onChange={(e) => updateFilter("height", e.target.value)}
                  className="h-[46px] w-full rounded-[14px] bg-[#F8F9FA] px-3.5 text-xs font-medium text-neutral-800 placeholder:text-slate-400 outline-none border border-transparent focus:border-slate-300 transition"
                />
                <select
                  value={draftFilters.listingLocale}
                  onChange={(e) => updateFilter("listingLocale", e.target.value)}
                  className="h-[46px] w-full rounded-[14px] bg-[#F8F9FA] px-3 text-xs font-medium text-slate-500 outline-none border border-transparent focus:border-slate-300 transition"
                >
                  <option value="">Elan dili</option>
                  <option value="az">AZ</option>
                  <option value="ru">RU</option>
                  <option value="en">EN</option>
                  <option value="tr">TR</option>
                </select>
              </div>
            )}
          </div>

          {/* Section 3: Son elanlar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-neutral-900">{t("listings_title", "Son elanlar")}</h2>
              <button
                type="button"
                onClick={() => setShowAllHomeListings((current) => !current)}
                className="text-sm font-bold text-neutral-900 transition hover:text-slate-600"
              >
                {showAllHomeListings ? t("catalog_close", "Bağla") : t("catalog_view_all", "Hamısına bax")}
              </button>
            </div>

            <div className="space-y-4">
              {categoryLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-[120px] rounded-[22px] bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : hasHomeListings ? (
                <div className="space-y-4">
                  {latestHomeListings.map((listing) => (
                    <HomeListingExactRow key={listing.id} listing={listing} />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[300px] items-center justify-center rounded-[22px] border border-slate-100 bg-white px-5 py-8 text-center shadow-sm">
                  <div>
                    <h3 className="text-lg font-semibold text-navy-900">{t("catalog_no_category", "Bu kateqoriyada elan yoxdur")}</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {selectedHomeCategory?.label} {t("catalog_no_category_hint", "üçün uyğun elan tapılmadı.")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {showAllHomeListings && !categoryLoading ? (
            renderAllListingsSection(false)
          ) : null}

          </section>
      </PublicPage>
    );
  }

  if (!isDataLoaded) {
    return (
      <PublicPage emphasizeBackground>
        <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-logistics-orange" />
          <p className="text-lg font-medium text-slate-500">{t("catalog_listings_loading", "Elanlar yüklənir...")}</p>
        </div>
      </PublicPage>
    );
  }

  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto w-full max-w-[1280px] min-w-0 px-4 sm:px-[32px] pt-[16px] pb-[16px]">
        {renderAllListingsSection(true)}
      </section>
    </PublicPage>
  );
}
