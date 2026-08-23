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
import { listingVisualTone } from "@/lib/listing-visual";
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

function categoryMatchesListing(category: PublicListingCategory, listing: CargoListing) {
  if (category.id === "all") {
    return true;
  }

  if (category.matchCargoType && listing.cargoType !== category.matchCargoType) {
    return false;
  }

  if (category.matchVehicleType && listing.vehicleType !== category.matchVehicleType) {
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
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  className?: string;
  placeholder?: string;
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

  return (
    <div ref={rootRef} className={cn("relative h-[60px] min-w-0 shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative flex h-full w-full min-w-0 flex-col items-start justify-start rounded-[13px] border bg-white px-4 pb-[11px] pt-[11px] text-left shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition duration-200 hover:-translate-y-px hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)]",
          open ? "border-logistics-orange ring-4 ring-orange-100" : "border-slate-200 hover:border-slate-300"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="max-w-full pr-9 whitespace-nowrap text-[14px] font-semibold leading-none text-navy-900">
          {label}
        </span>
        <span
          className={cn(
            "mt-1 block max-w-full pr-9 text-[13px] font-medium leading-none",
            value ? "text-slate-700" : "text-slate-400"
          )}
        >
          {selectedLabel}
        </span>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition",
            open && "rotate-180 text-logistics-orange"
          )}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-40 min-w-full max-w-[320px] overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)] [width:max-content]">
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
        focused ? "border-logistics-orange ring-4 ring-orange-100" : "border-slate-200 hover:border-slate-300"
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
        className="h-11 rounded-[12px] border border-slate-200 bg-white px-3 text-[0.95rem] text-slate-700 outline-none transition duration-200 placeholder:text-slate-500 hover:border-slate-300 focus:border-logistics-orange focus:ring-4 focus:ring-orange-100"
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

  return (
    <Link
      href={`/loads/${listing.id}`}
      className="grid gap-4 px-5 py-[18px] transition duration-200 hover:bg-slate-50 sm:grid-cols-[128px,minmax(0,1fr),174px]"
    >
      <div className={cn("flex h-24 w-24 items-center justify-center rounded-2xl", tone.panel)}>
        <Icon className="h-11 w-11" />
      </div>

      <div className="min-w-0">
        <h3 className="truncate text-[1.22rem] font-bold leading-tight text-navy-900">{listing.title}</h3>
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
      className="group flex w-[92px] shrink-0 flex-col items-center gap-2 text-center sm:w-auto sm:gap-2.5"
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
      <span className={cn("max-w-full text-[0.84rem] font-semibold leading-tight transition-colors duration-200 sm:text-[0.88rem]", active ? activeTone.text : "text-slate-500")}>{label}</span>
    </button>
  );
}

function HomeListingCard({ listing }: { listing: CargoListing }) {
  const quantityLabel = listingQuantity(listing);
  const volumeLabel = listingVolume(listing);
  const dimensionsLabel = listingDimensions(listing);
  const { t } = useLocale();

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
          {listing.title}
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
  const { t } = useLocale();

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
        <h3 className="line-clamp-2 text-[1.03rem] font-semibold leading-[1.24] text-navy-900">{listing.title}</h3>
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
    return layout === "list" ? "list" : "grid";
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() => searchParams.get("advanced") === "1");
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
          label: (locale !== "az" && (category as unknown as { labelTranslations?: Record<string, string> }).labelTranslations?.[locale]) || category.label,
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
        <section className="mx-auto w-full min-w-0 max-w-[1240px] overflow-hidden px-3 pb-5 pt-3 sm:px-6 lg:px-8">
          {loadError ? (
            <div
              role="alert"
              className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
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

          <section className="relative isolate w-full overflow-hidden rounded-[24px] bg-navy-900 px-5 pb-8 pt-8 text-white sm:px-10 sm:pb-14 sm:pt-12 lg:px-12">
            <svg
              className="pointer-events-none absolute inset-0 -z-10 h-full w-full text-white/15"
              viewBox="0 0 1240 520"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <path
                d="M-40 362C178 188 284 482 510 312S812 76 1040 212s248 18 330-132"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="510" cy="312" r="8" fill="#f97316" />
              <circle cx="1040" cy="212" r="6" fill="#f97316" />
            </svg>
            <div className="mx-auto max-w-[1240px]">
              <div className="max-w-2xl">
                <h1 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-[-0.035em] sm:text-5xl lg:text-[3.65rem]">
                  {t("home_hero_title", "Daşımalarınızı bizimlə asanlaşdırın")}
                </h1>
                <p className="mt-5 max-w-lg text-base leading-7 text-slate-200 sm:text-lg">
                  {t("home_hero_subtitle", "Yükünüz üçün doğru marşrutu, nəqliyyatı və daşıyıcını bir yerdə tapın.")}
                </p>
              </div>
            </div>
          </section>

          <div className="relative z-10 mt-6 min-w-0 overflow-visible rounded-[24px] border border-[var(--planner-outline)] bg-[var(--planner-surface-raised)] p-3 sm:mt-8 sm:p-5">
            <div className="border-b border-[var(--planner-outline)] pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--planner-primary)]">{t("search_eyebrow", "Axtarış planı")}</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[var(--planner-text)]">{t("search_title", "Marşrutunuzu planlayın")}</h2>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--planner-text-muted)]">
                {t("search_route_label", "Yükləmə və çatdırılma nöqtələri")}
              </p>
              <div className="grid min-w-0 gap-3 overflow-visible lg:grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)]">
                <CatalogSelectCard
                  label={t("search_pickup_city", "Yükləmə şəhəri")}
                  value={draftFilters.pickupCity}
                  onChange={(value) => updateFilter("pickupCity", value)}
                  options={dynCities}
                  className="w-full"
                  placeholder={t("catalog_select_placeholder", "Seçin")}
                />
                <div className="hidden lg:flex lg:items-start">
                  <button
                    type="button"
                    onClick={() =>
                      setDraftFilters((current) => ({
                        ...current,
                        pickupCity: current.deliveryCity,
                        deliveryCity: current.pickupCity
                      }))
                    }
                    className="flex h-[60px] w-12 items-center justify-center rounded-[13px] border border-[var(--planner-outline)] bg-[var(--planner-surface)] text-[var(--planner-text-muted)] transition-colors duration-200 hover:border-[var(--planner-primary)] hover:text-[var(--planner-primary)]"
                    aria-label="Marşrutu dəyiş"
                  >
                    <ArrowLeftRight className="h-5 w-5" />
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
              </div>
            </div>

            <div className="mt-3 grid min-w-0 gap-3 overflow-visible sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.25fr)_148px]">
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
              <CatalogInputCard
                label={t("search_keyword", "Açar söz")}
                placeholder={t("search_keyword_placeholder", "məs: mebel, taxta, taxıl")}
                value={draftFilters.keyword}
                onChange={(value) => updateFilter("keyword", value)}
                className="w-full"
              />
              <div className="flex w-full min-w-0 items-start sm:col-span-2 lg:col-span-1">
                <Button
                  className="h-[60px] w-full rounded-xl bg-[var(--planner-primary-action)] text-[var(--planner-text)] shadow-none transition-colors duration-200 hover:bg-[var(--planner-primary)] hover:text-white"
                  onClick={() => submitFilters()}
                  disabled={isSearching}
                >
                  {isSearching ? <LoaderCircle className="h-4.5 w-4.5 animate-spin" /> : <Search className="h-4.5 w-4.5" />}
                  {isSearching ? t("search_btn_loading", "Axtarılır...") : t("search_btn", "Axtar")}
                </Button>
              </div>
            </div>

            <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--planner-outline)] pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters((current) => !current)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-[13px] border px-4 text-sm font-semibold transition-colors duration-200",
                    showAdvancedFilters
                      ? "border-[var(--planner-primary)] bg-[var(--planner-primary-tint)] text-[var(--planner-primary)]"
                      : "border-[var(--planner-outline)] bg-white text-[var(--planner-text-muted)] hover:border-[var(--planner-primary)] hover:text-[var(--planner-primary)]"
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {t("search_advanced_btn", "Ətraflı filter")}
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvancedFilters && "rotate-180")} />
                </button>

                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex min-h-11 items-center gap-2 rounded-[13px] border border-[var(--planner-outline)] bg-white px-4 text-sm font-semibold text-[var(--planner-text-muted)] transition-colors duration-200 hover:border-[var(--planner-primary)] hover:text-[var(--planner-primary)]"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    {t("catalog_reset", "Sıfırla")}
                  </button>
                ) : null}
              </div>

              <p className="min-w-0 max-w-full text-sm leading-5 text-[var(--planner-text-muted)]">
                {t("search_advanced_hint", "Ətraflı filtrdən istifadə edərək uyğun nəticələri daha tez tapa bilərsiniz.")}
              </p>
            </div>

            <div
              className={cn(
                "grid overflow-hidden transition-all duration-300 ease-out",
                showAdvancedFilters ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="grid gap-4 rounded-[18px] border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 xl:grid-cols-4">
                  <AdvancedFilterCell
                    label={t("catalog_filter_min_price", "Min qiymət (AZN)")}
                    value={draftFilters.minPrice}
                    placeholder="100"
                    type="number"
                    inputMode="numeric"
                    onChange={(value) => updateFilter("minPrice", value)}
                  />
                  <AdvancedFilterCell
                    label={t("catalog_filter_max_price", "Max qiymət (AZN)")}
                    value={draftFilters.maxPrice}
                    placeholder="5000"
                    type="number"
                    inputMode="numeric"
                    onChange={(value) => updateFilter("maxPrice", value)}
                  />
                  <AdvancedFilterCell
                    label={t("catalog_filter_min_weight", "Min çəki (kg)")}
                    value={draftFilters.minWeight}
                    placeholder="1000"
                    type="number"
                    inputMode="numeric"
                    onChange={(value) => updateFilter("minWeight", value)}
                  />
                  <AdvancedFilterCell
                    label={t("catalog_filter_max_weight", "Max çəki (kg)")}
                    value={draftFilters.maxWeight}
                    placeholder="25000"
                    type="number"
                    inputMode="numeric"
                    onChange={(value) => updateFilter("maxWeight", value)}
                  />
                  <AdvancedFilterCell
                    label={t("catalog_filter_date_from", "Tarixdən")}
                    value={draftFilters.dateFrom}
                    placeholder=""
                    type="date"
                    onChange={(value) => updateFilter("dateFrom", value)}
                  />
                  <AdvancedFilterCell
                    label={t("catalog_filter_date_to", "Tarixədək")}
                    value={draftFilters.dateTo}
                    placeholder=""
                    type="date"
                    onChange={(value) => updateFilter("dateTo", value)}
                  />
                  <AdvancedFilterCell
                    label={t("catalog_filter_min_volume", "Min həcm (m3)")}
                    value={draftFilters.minVolume}
                    placeholder="12"
                    type="number"
                    inputMode="decimal"
                    onChange={(value) => updateFilter("minVolume", value)}
                  />
                  <AdvancedFilterCell
                    label={t("catalog_filter_max_volume", "Max həcm (m3)")}
                    value={draftFilters.maxVolume}
                    placeholder="120"
                    type="number"
                    inputMode="decimal"
                    onChange={(value) => updateFilter("maxVolume", value)}
                  />
                  <AdvancedFilterCell
                    label={t("catalog_filter_length", "Uzunluq (m)")}
                    value={draftFilters.length}
                    placeholder="12"
                    type="number"
                    inputMode="decimal"
                    onChange={(value) => updateFilter("length", value)}
                  />
                  <AdvancedFilterCell
                    label={t("catalog_filter_width", "En (m)")}
                    value={draftFilters.width}
                    placeholder="12"
                    type="number"
                    inputMode="decimal"
                    onChange={(value) => updateFilter("width", value)}
                  />
                  <AdvancedFilterCell
                    label={t("catalog_filter_height", "Hündürlük (m)")}
                    value={draftFilters.height}
                    placeholder="50"
                    type="number"
                    inputMode="decimal"
                    onChange={(value) => updateFilter("height", value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <h2 className="text-[1.9rem] font-bold text-[#171717]">{t("listings_title", "Son elanlar")}</h2>
            <button
              type="button"
              onClick={() => setShowAllHomeListings((current) => !current)}
              className="inline-flex items-center gap-1.5 text-[0.98rem] font-semibold text-logistics-orange transition hover:opacity-80"
            >
              {showAllHomeListings ? t("catalog_close", "Bağla") : t("catalog_view_all", "Hamısına bax")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 min-h-[560px] sm:min-h-[520px] xl:min-h-[500px]">
            {categoryLoading ? (
              <div className="grid gap-5 grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <HomeListingCardSkeleton key={index} index={index} />
                ))}
              </div>
            ) : hasHomeListings ? (
              <div className="grid gap-5 grid-cols-2 xl:grid-cols-4">
                {latestHomeListings.map((listing) => (
                  <HomeListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-[22px] border border-slate-200 bg-white px-5 py-8 text-center">
                <div>
                  <h3 className="text-lg font-semibold text-navy-900">{t("catalog_no_category", "Bu kateqoriyada elan yoxdur")}</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedHomeCategory?.label} {t("catalog_no_category_hint", "üçün uyğun elan tapılmadı.")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {showAllHomeListings && !categoryLoading ? (
            <div className="mt-7 rounded-[24px] border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-[1.25rem] font-bold text-navy-900">{t("catalog_all_listings", "Bütün elanlar")}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Intl.NumberFormat("az-AZ").format(homeInfinite.loadedCount)} /{" "}
                    {new Intl.NumberFormat("az-AZ").format(homeListings.length)} {t("catalog_listings_shown", "elan göstərilir")}
                  </p>
                </div>

                <div className="inline-flex w-fit items-center rounded-[14px] border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setHomeView("grid")}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-[10px] px-3 text-sm font-semibold transition",
                      homeView === "grid" ? "bg-white text-navy-900 shadow-sm" : "text-slate-500"
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    {t("catalog_grid", "Kvadratlar")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHomeView("list")}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-[10px] px-3 text-sm font-semibold transition",
                      homeView === "list" ? "bg-white text-navy-900 shadow-sm" : "text-slate-500"
                    )}
                  >
                    <List className="h-4 w-4" />
                    {t("catalog_list", "Siyahı")}
                  </button>
                </div>
              </div>

              {homeView === "grid" ? (
                <div className="mt-5 grid gap-5 grid-cols-2 xl:grid-cols-4">
                  {homeInfinite.visibleItems.map((listing) => (
                    <HomeListingCard key={`all-grid-${listing.id}`} listing={listing} />
                  ))}
                  {homeInfinite.isLoadingMore ? (
                    <div className="flex h-12 w-full items-center justify-center">
                      <LoaderCircle className="h-6 w-6 animate-spin text-logistics-orange" />
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {homeInfinite.visibleItems.map((listing) => (
                    <HomeListingRow key={`all-list-${listing.id}`} listing={listing} />
                  ))}
                  {homeInfinite.isLoadingMore ? (
                    <div className="flex h-12 w-full items-center justify-center">
                      <LoaderCircle className="h-6 w-6 animate-spin text-logistics-orange" />
                    </div>
                  ) : null}
                </div>
              )}

              {homeInfinite.hasMore ? <div ref={homeInfinite.sentinelRef} className="h-6 w-full" aria-hidden="true" /> : null}
            </div>
          ) : null}

          <div className="mt-8 border-t border-slate-200 pt-5">
            <h2 className="text-base font-semibold text-navy-900">{t("categories_title", "Kateqoriyalara baxın")}</h2>
            <div className="-mx-1 mt-3 flex max-w-full gap-3 overflow-x-auto px-1 py-2 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:justify-start sm:gap-8 sm:px-0 sm:gap-4">
              {homeCategoryViews.map((category) => (
                <HomeCategoryButton
                  key={category.id}
                  label={category.label}
                  active={homeCategory === category.id}
                  icon={category.icon}
                  iconTone={category.iconTone}
                  onClick={() => setHomeCategory(category.id)}
                />
              ))}
            </div>
          </div>
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
      <section className="mx-auto max-w-[1780px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="overflow-visible rounded-[18px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
          <div className="grid w-full gap-3 p-4 sm:grid-cols-2 min-[1180px]:grid-cols-[180px_48px_190px_160px_190px_minmax(220px,1fr)_150px] lg:p-[18px]">
            <CatalogFilterField label={t("search_pickup_city", "Yükləmə şəhəri")}>
              <CatalogSelectCard
                label={t("search_pickup_city", "Yükləmə şəhəri")}
                value={draftFilters.pickupCity}
                onChange={(value) => updateFilter("pickupCity", value)}
                options={dynCities}
                className="w-full"
                placeholder={t("catalog_select_placeholder", "Seçin")}
              />
            </CatalogFilterField>

            <div className="hidden min-[1180px]:flex min-[1180px]:items-start">
              <button
                type="button"
                onClick={() => {
                  const next = {
                    ...draftFilters,
                    pickupCity: draftFilters.deliveryCity,
                    deliveryCity: draftFilters.pickupCity
                  };
                  setDraftFilters(next);
                }}
                className="flex h-[60px] w-12 items-center justify-center rounded-[13px] border border-slate-200 bg-white text-slate-500 transition duration-200 hover:-translate-y-px hover:border-slate-300 hover:text-navy-900 hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                aria-label="Marşrutu dəyiş"
              >
                <ArrowLeftRight className="h-5 w-5" />
              </button>
            </div>

            <CatalogFilterField label={t("search_delivery_city", "Çatdırılma şəhəri")}>
              <CatalogSelectCard
                label={t("search_delivery_city", "Çatdırılma şəhəri")}
                value={draftFilters.deliveryCity}
                onChange={(value) => updateFilter("deliveryCity", value)}
                options={dynCities}
                className="w-full"
                placeholder={t("catalog_select_placeholder", "Seçin")}
              />
            </CatalogFilterField>

            <CatalogFilterField label={t("search_cargo_type", "Yük növü")}>
              <CatalogSelectCard
                label={t("search_cargo_type", "Yük növü")}
                value={draftFilters.cargoType}
                onChange={(value) => updateFilter("cargoType", value)}
                options={dynCargoTypes}
                className="w-full"
                placeholder={t("catalog_select_placeholder", "Seçin")}
              />
            </CatalogFilterField>

            <CatalogFilterField label={t("search_vehicle_type", "Nəqliyyat növü")}>
              <CatalogSelectCard
                label={t("search_vehicle_type", "Nəqliyyat növü")}
                value={draftFilters.vehicleType}
                onChange={(value) => updateFilter("vehicleType", value)}
                options={dynVehicleTypes}
                className="w-full"
                placeholder={t("catalog_select_placeholder", "Seçin")}
              />
            </CatalogFilterField>

            <CatalogFilterField label={t("search_keyword", "Açar söz")}>
              <CatalogInputCard
                label={t("search_keyword", "Açar söz")}
                placeholder={t("search_keyword_placeholder", "məs: mebel, taxta, taxıl")}
                value={draftFilters.keyword}
                onChange={(value) => updateFilter("keyword", value)}
                className="w-full"
              />
            </CatalogFilterField>

            <div className="flex w-full items-start gap-3 sm:col-span-2 min-[1180px]:col-span-1">
              <Button
                className="h-[60px] w-full rounded-[13px] text-[0.98rem] transition duration-200 hover:-translate-y-px hover:shadow-[0_14px_28px_rgba(249,115,22,0.24)]"
                onClick={() => submitFilters()}
                disabled={isSearching}
              >
                {isSearching ? <LoaderCircle className="h-4.5 w-4.5 animate-spin" /> : <Search className="h-4.5 w-4.5" />}
                {isSearching ? t("search_btn_loading", "Axtarılır...") : t("search_btn", "Axtar")}
              </Button>
            </div>
          </div>
        </div>

        <div className="-mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
          {chipConfigs.map((chip) => (
            <CatalogChip
              key={chip.key}
              active={activeChip === chip.key}
              icon={chip.icon}
              label={chip.label}
              onClick={() => applyChip(chip)}
            />
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-navy-900"
          >
            <ArrowLeftRight className="h-4 w-4" />
            {t("catalog_reset", "Sıfırla")}
          </button>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr),428px]">
          <div className="overflow-hidden rounded-[18px] border border-slate-200/90 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[1.1rem] font-semibold text-navy-900">
                {t("catalog_found", "Tapıldı")}: {resultsHeadline} {t("catalog_listings_unit", "elan")}
              </p>

              <div className="flex items-center gap-3">
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortMode)}
                  className="form-field h-11 min-w-0 w-full rounded-[14px] px-4 py-0 text-[0.96rem] sm:min-w-[174px] sm:w-auto"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {sortedListings.length ? (
              <div className="grid gap-5 grid-cols-1 xl:grid-cols-2">
                {loadsInfinite.visibleItems.map((listing) => (
                  <div key={listing.id} className="xl:col-span-1">
                    <CatalogListingRow listing={listing} />
                  </div>
                ))}
                {loadsInfinite.isLoadingMore
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <CatalogListingRowSkeleton key={`loads-skeleton-${index}`} />
                    ))
                  : null}
                {loadsInfinite.hasMore ? (
                  <div ref={loadsInfinite.sentinelRef} className="xl:col-span-2 h-6 w-full" aria-hidden="true" />
                ) : null}
              </div>
            ) : (
              <div className="px-6 py-14 text-center">
                <h2 className="text-2xl font-bold text-navy-900">{t("catalog_no_results", "Uyğun elan tapılmadı")}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {t("catalog_no_results_hint", "Filtrləri yumşaldın və ya yeni elanlar üçün bir az sonra yenidən baxın.")}
                </p>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[18px] border border-slate-200/90 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <h2 className="text-[1.52rem] font-bold leading-tight text-navy-900">{t("catalog_cta_title", "Yükünüzü tez çatdırın")}</h2>
              <p className="mt-3 text-[0.98rem] leading-8 text-slate-600">
                {t("catalog_cta_desc", "Elan yerləşdirin, minlərlə daşıyıcı sizin yükünüzü görsün.")}
              </p>

              <div className="mt-5 space-y-3 text-[0.98rem] text-slate-600">
                <p className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-logistics-orange" />
                  {t("catalog_cta_free", "Pulsuz elan yerləşdirmə")}
                </p>
                <p className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-logistics-orange" />
                  {t("catalog_cta_carriers", "Minlərlə aktiv daşıyıcı")}
                </p>
                <p className="flex items-center gap-3">
                  <MessageCircleMore className="h-5 w-5 text-logistics-orange" />
                  {t("catalog_cta_fast", "Tez və etibarlı həll")}
                </p>
              </div>

              <ButtonLink
                href="/cargo-owner/cargo-posts/new"
                className="mt-6 flex w-full justify-center rounded-[14px] py-3 text-[1.08rem]"
              >
                {t("catalog_cta_btn", "Yük yerləşdir")}
              </ButtonLink>
            </div>

            <div className="rounded-[18px] border border-slate-200/90 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <h2 className="text-[1.34rem] font-bold text-navy-900">{t("catalog_stats_title", "Tranzit.AZ rəqəmlərlə")}</h2>
              <div className="mt-5 space-y-4 text-[1rem] text-slate-600">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[1.12rem] font-bold text-navy-900">12 450+</span>
                  <span>{t("catalog_stats_listings", "Aktiv elan")}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[1.12rem] font-bold text-navy-900">8 230+</span>
                  <span>{t("catalog_stats_carriers", "Qeydiyyatdan keçmiş daşıyıcı")}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[1.12rem] font-bold text-navy-900">34 600+</span>
                  <span>{t("catalog_stats_deliveries", "Uğurlu daşınma")}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[1.12rem] font-bold text-navy-900">98%</span>
                  <span>{t("catalog_stats_satisfaction", "Müştəri məmnuniyyəti")}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-slate-200/90 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <h2 className="text-[1.34rem] font-bold text-navy-900">{t("catalog_trust_title", "Etibarlı platforma")}</h2>
              <div className="mt-5 grid gap-4 text-sm leading-6 text-slate-600 sm:grid-cols-3 xl:grid-cols-1">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-navy-900" />
                  <span>{t("catalog_trust_safe", "Təhlükəsiz əlaqə")}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-5 w-5 text-navy-900" />
                  <span>{t("catalog_trust_data", "Məlumatlarınız qorunur")}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-5 w-5 text-navy-900" />
                  <span>{t("catalog_trust_support", "Dəstək xidməti 24/7")}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-5 overflow-hidden rounded-[18px] border border-slate-200/90 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="grid gap-0 lg:grid-cols-[240px,1fr]">
            <div className="border-b border-slate-200 px-6 py-7 lg:border-b-0 lg:border-r">
              <h2 className="text-[1.7rem] font-bold leading-tight text-navy-900">{t("catalog_hiw_title", "Necə işləyir?")}</h2>
            </div>
            <div className="grid gap-0 md:grid-cols-3">
              {howItWorksSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div
                    key={step.number}
                    className={cn(
                      "flex gap-4 px-6 py-6",
                      index < howItWorksSteps.length - 1 && "border-b border-slate-200 md:border-b-0 md:border-r"
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-logistics-orange text-sm font-bold text-white">
                      {step.number}
                    </div>
                    <div className="flex min-w-0 gap-4">
                      <Icon className="mt-1 h-9 w-9 shrink-0 text-slate-400" />
                      <div>
                        <h3 className="text-[1.1rem] font-bold text-navy-900">{step.title}</h3>
                        <p className="mt-2 text-[0.96rem] leading-6 text-slate-600">{step.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
