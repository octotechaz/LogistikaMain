import { effectiveStatus, isPublicListing, listingStatusLabels } from "@/lib/status/classifieds";
import type { CargoListing, ListingFilters } from "@/types/classifieds";

const fullMonthNames = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avqust",
  "sentyabr",
  "oktyabr",
  "noyabr",
  "dekabr"
];

const shortMonthNames = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];

function formatGroupedNumber(value: number) {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatListingDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) {
    return "Qeyd edilməyib";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Qeyd edilməyib";
  }

  if (options?.hour || options?.minute) {
    return new Intl.DateTimeFormat("az-AZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...options
    }).format(date);
  }

  const day = String(date.getDate()).padStart(2, "0");
  const monthName = shortMonthNames[date.getMonth()] ?? shortMonthNames[0];
  return `${day} ${monthName} ${date.getFullYear()}`;
}

export function formatPrice(value?: number | string) {
  if (value === undefined || value === null || value === "") {
    return "Razılaşma ilə";
  }

  const amount = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(amount)) {
    return "Razılaşma ilə";
  }

  return `${formatGroupedNumber(amount)} AZN`;
}

export function formatPriceCompact(value?: number | string) {
  if (value === undefined || value === null || value === "") {
    return "Razılaşma";
  }

  const amount = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(amount)) {
    return "Razılaşma";
  }

  return `${formatGroupedNumber(amount)} AZN`;
}

export function formatWeight(value?: number | string) {
  if (value === undefined || value === null || value === "") {
    return "Qeyd edilməyib";
  }

  const amount = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(amount)) {
    return String(value);
  }

  if (amount >= 1000) {
    const tons = amount / 1000;
    const tonValue = Number.isInteger(tons) ? formatGroupedNumber(tons) : tons.toFixed(1).replace(".", ",");
    return `${tonValue} ton`;
  }

  return `${formatGroupedNumber(amount)} kg`;
}

export function formatWeightKg(value?: number | string) {
  if (value === undefined || value === null || value === "") {
    return "Qeyd edilməyib";
  }

  const amount = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(amount)) {
    return String(value);
  }

  return `${formatGroupedNumber(amount)} kg`;
}

export function formatListingDateTimeShort(value?: string | null) {
  if (!value) {
    return "Tarix yoxdur";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Tarix yoxdur";
  }

  const now = new Date();
  const time = new Intl.DateTimeFormat("az-AZ", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);

  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return `Bugün ${time}`;
  }

  const day = String(date.getDate()).padStart(2, "0");
  const monthName = shortMonthNames[date.getMonth()] ?? shortMonthNames[0];
  return `${day} ${monthName} ${time}`;
}

export function formatDateNumeric(value?: string | null) {
  if (!value) {
    return "Qeyd edilməyib";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Qeyd edilməyib";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const monthName = fullMonthNames[date.getMonth()] ?? fullMonthNames[0];
  return `${day} ${monthName} ${date.getFullYear()}`;
}

export function listingStatusText(listing: CargoListing) {
  return listingStatusLabels[effectiveStatus(listing)];
}

export function getPublicListings(listings: CargoListing[]) {
  return listings
    .filter(isPublicListing)
    .sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt));
}

export function applyListingFilters(listings: CargoListing[], filters: ListingFilters) {
  const keyword = filters.keyword.trim().toLocaleLowerCase("az");

  return listings.filter((listing) => {
    const matchesKeyword =
      keyword === "" ||
      [
        listing.title,
        listing.description,
        listing.pickupCity,
        listing.deliveryCity,
        listing.cargoType,
        listing.vehicleType
      ]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("az").includes(keyword));

    const matchesPickupCity =
      filters.pickupCity === "" || listing.pickupCity === filters.pickupCity;
    const matchesDeliveryCity =
      filters.deliveryCity === "" || listing.deliveryCity === filters.deliveryCity;
    const matchesCargoType =
      filters.cargoType === "" || listing.cargoType === filters.cargoType;
    const matchesVehicleType =
      filters.vehicleType === "" || listing.vehicleType === filters.vehicleType;

    const numericWeight = Number(listing.weight);
    const matchesMinWeight =
      filters.minWeight === "" || (!Number.isNaN(numericWeight) && numericWeight >= Number(filters.minWeight));
    const matchesMaxWeight =
      filters.maxWeight === "" || (!Number.isNaN(numericWeight) && numericWeight <= Number(filters.maxWeight));

    const numericPrice = Number(listing.price);
    const matchesMinPrice =
      filters.minPrice === "" ||
      (!Number.isNaN(numericPrice) && numericPrice >= Number(filters.minPrice));
    const matchesMaxPrice =
      filters.maxPrice === "" ||
      (!Number.isNaN(numericPrice) && numericPrice <= Number(filters.maxPrice));

    const listingDateValue =
      listing.pickupDeadlineDate || listing.pickupDate || listing.createdAt;
    const listingDate = new Date(listingDateValue);
    const matchesDateFrom =
      filters.dateFrom === "" ||
      (!Number.isNaN(listingDate.getTime()) && listingDate >= new Date(filters.dateFrom));
    const matchesDateTo =
      filters.dateTo === "" ||
      (!Number.isNaN(listingDate.getTime()) && listingDate <= new Date(`${filters.dateTo}T23:59:59`));

    const numericLength = Number(listing.length);
    const numericWidth = Number(listing.width);
    const numericHeight = Number(listing.height);
    const volume =
      !Number.isNaN(numericLength) && !Number.isNaN(numericWidth) && !Number.isNaN(numericHeight)
        ? numericLength * numericWidth * numericHeight
        : Number.NaN;

    const matchesLength =
      filters.length === "" || (!Number.isNaN(numericLength) && numericLength >= Number(filters.length));
    const matchesWidth =
      filters.width === "" || (!Number.isNaN(numericWidth) && numericWidth >= Number(filters.width));
    const matchesHeight =
      filters.height === "" || (!Number.isNaN(numericHeight) && numericHeight >= Number(filters.height));
    const matchesMinVolume =
      filters.minVolume === "" || (!Number.isNaN(volume) && volume >= Number(filters.minVolume));
    const matchesMaxVolume =
      filters.maxVolume === "" || (!Number.isNaN(volume) && volume <= Number(filters.maxVolume));

    const matchesLocale = !filters.listingLocale ||
      !!(listing.translations as Record<string, unknown> | undefined)?.[filters.listingLocale];

    return (
      matchesKeyword &&
      matchesPickupCity &&
      matchesDeliveryCity &&
      matchesCargoType &&
      matchesVehicleType &&
      matchesMinWeight &&
      matchesMaxWeight &&
      matchesMinPrice &&
      matchesMaxPrice &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesLength &&
      matchesWidth &&
      matchesHeight &&
      matchesMinVolume &&
      matchesMaxVolume &&
      matchesLocale
    );
  });
}

export function createEmptyFilters(): ListingFilters {
  return {
    keyword: "",
    pickupCity: "",
    deliveryCity: "",
    cargoType: "",
    minWeight: "",
    maxWeight: "",
    vehicleType: "",
    minPrice: "",
    maxPrice: "",
    dateFrom: "",
    dateTo: "",
    minVolume: "",
    maxVolume: "",
    length: "",
    width: "",
    height: "",
    listingLocale: ""
  };
}
