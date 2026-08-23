export type ListingStatus =
  | "PENDING"
  | "ACTIVE"
  | "REJECTED"
  | "EXPIRED"
  | "INACTIVE"
  | "DELETED";

export type UserRole = "CARGO_OWNER" | "ADMIN";
export type UserStatus = "ACTIVE" | "BLOCKED";

export interface CargoOwner {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyName?: string;
  taxId?: string;
  status: UserStatus;
  role: UserRole;
  registeredAt: string;
}

export interface CargoListing {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  ownerProfilePicture?: string;
  ownerCreatedAt?: string;
  title: string;
  cargoType: string;
  description: string;
  weight: number;
  volume?: number | string;
  length?: number | string;
  width?: number | string;
  height?: number | string;
  quantity?: string;
  pickupCity: string;
  pickupAddress: string;
  deliveryCity: string;
  deliveryAddress: string;
  pickupDate?: string;
  pickupDeadlineDate?: string;
  pickupTime?: string;
  vehicleType?: string;
  price?: number | string;
  note?: string;
  needsLoadingHelp?: string;
  needsUnloadingHelp?: string;
  requiresInvoice?: string;
  roundTrip?: string;
  durationDays?: 5 | 10 | 30;
  createdAt: string;
  approvedAt?: string | null;
  expiresAt?: string | null;
  deactivatedAt?: string | null;
  rejectionReason?: string | null;
  status: ListingStatus;
  photo?: string;
  photos?: string[];
}

export interface Banner {
  id: string;
  label?: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaLink?: string;
  background?: string;
  imageData?: string;
  imageUrl?: string;
  textColor?: string;
  order: number;
  isActive: boolean;
}

export interface PublicListingCategory {
  id: string;
  label: string;
  labelTranslations?: Record<string, string>;
  iconKey: string;
  iconTone: string;
  matchCargoType?: string;
  matchVehicleType?: string;
  matchKeyword?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ListingFilters {
  keyword: string;
  pickupCity: string;
  deliveryCity: string;
  cargoType: string;
  minWeight: string;
  maxWeight: string;
  vehicleType: string;
  minPrice: string;
  maxPrice: string;
  dateFrom: string;
  dateTo: string;
  minVolume: string;
  maxVolume: string;
  length: string;
  width: string;
  height: string;
}


export interface CargoListingDraft {
  title: string;
  cargoType: string;
  description: string;
  weight: string;
  pickupCity: string;
  pickupAddress: string;
  deliveryCity: string;
  deliveryAddress: string;
  ownerPhone: string;
  photo: string;
  photos?: string[];
  volume?: string;
  length?: string;
  width?: string;
  height?: string;
  quantity?: string;
  pickupDate?: string;
  pickupDeadlineDate: string;
  pickupTime?: string;
  vehicleType?: string;
  price?: string;
  note?: string;
  needsLoadingHelp?: string;
  needsUnloadingHelp?: string;
  requiresInvoice?: string;
  roundTrip?: string;
}
