import "server-only";

import type { Prisma } from "@prisma/client";
import { activeCargoPostWhere, deactivateExpiredCargoPosts } from "@/lib/cargo-post-expiration";
import { prisma } from "@/lib/prisma";
import { publicUserSelect } from "@/lib/prisma-selects";
import type { CargoListing } from "@/types/classifieds";

const publicListingSelect = {
  id: true,
  ownerId: true,
  cargoName: true,
  cargoType: true,
  description: true,
  weight: true,
  volume: true,
  length: true,
  width: true,
  height: true,
  quantity: true,
  pickupAddress: true,
  deliveryAddress: true,
  pickupCity: true,
  deliveryCity: true,
  pickupDate: true,
  pickupDeadlineDate: true,
  requiredVehicleType: true,
  proposedPrice: true,
  contactPhone: true,
  needsLoadingHelp: true,
  needsUnloadingHelp: true,
  requiresInvoice: true,
  roundTrip: true,
  legacyPickupTime: true,
  legacyNote: true,
  legacyViewCount: true,
  expiresAt: true,
  deactivatedAt: true,
  createdAt: true,
  owner: { select: publicUserSelect },
  cargoOwnerProfile: {
    select: {
      companyName: true,
      user: { select: publicUserSelect },
    },
  },
  images: {
    orderBy: { createdAt: "asc" as const },
    select: { url: true },
  },
} satisfies Prisma.CargoPostSelect;

type PublicCargoPost = Prisma.CargoPostGetPayload<{ select: typeof publicListingSelect }> & {
  translations?: Record<string, { title?: string; description?: string }> | null;
};

function ownerDisplayName(post: PublicCargoPost) {
  const profile = post.cargoOwnerProfile;
  const user = profile?.user ?? post.owner;
  const company = profile?.companyName || user?.companyName;
  if (company?.trim()) {
    return company.trim();
  }
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  return fullName || "İstifadəçi";
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toDateOnly(value: Date | null | undefined) {
  if (!value) {
    return undefined;
  }
  return value.toISOString().slice(0, 10);
}

export function mapCargoPostToPublicListing(post: PublicCargoPost): CargoListing {
  const photos = post.images.map((image) => image.url).filter(Boolean);
  const user = post.cargoOwnerProfile?.user ?? post.owner;

  return {
    id: post.id,
    ownerId: post.ownerId,
    ownerName: ownerDisplayName(post),
    ownerPhone: post.contactPhone || user?.phone || "",
    ownerEmail: user?.email || undefined,
    ownerProfilePicture: user?.profileImage || undefined,
    ownerCreatedAt: toIso(user?.createdAt) ?? undefined,
    title: post.cargoName,
    cargoType: post.cargoType,
    description: post.description,
    weight: post.weight,
    volume: post.volume ?? undefined,
    length: post.length ?? undefined,
    width: post.width ?? undefined,
    height: post.height ?? undefined,
    quantity: post.quantity ?? "",
    pickupCity: post.pickupCity,
    pickupAddress: post.pickupAddress,
    deliveryCity: post.deliveryCity,
    deliveryAddress: post.deliveryAddress,
    pickupDate: toDateOnly(post.pickupDate),
    pickupDeadlineDate: toDateOnly(post.pickupDeadlineDate) ?? undefined,
    pickupTime: post.legacyPickupTime ?? undefined,
    vehicleType: post.requiredVehicleType,
    price: post.proposedPrice != null ? String(post.proposedPrice) : undefined,
    note: post.legacyNote ?? undefined,
    needsLoadingHelp: post.needsLoadingHelp ?? undefined,
    needsUnloadingHelp: post.needsUnloadingHelp ?? undefined,
    requiresInvoice: post.requiresInvoice ?? undefined,
    roundTrip: post.roundTrip ?? undefined,
    translations: (post as unknown as { translations?: Record<string, { title?: string; description?: string }> }).translations,
    createdAt: post.createdAt.toISOString(),
    approvedAt: null,
    expiresAt: toIso(post.expiresAt),
    deactivatedAt: toIso(post.deactivatedAt),
    rejectionReason: null,
    status: "ACTIVE",
    photo: photos[0] ?? "",
    photos,
  };
}

export function publicApprovedCargoPostWhere(now = new Date()): Prisma.CargoPostWhereInput {
  return {
    AND: [
      activeCargoPostWhere(now),
      { legacyAdminStatus: "APPROVED" },
      { deactivatedAt: null },
    ],
  };
}

function listingIdWhere(id: string): Prisma.CargoPostWhereInput {
  if (/^\d+$/.test(id)) {
    return { legacySqliteId: Number(id) };
  }
  return { id };
}

export async function getPublicListingsFromPostgres(): Promise<CargoListing[]> {
  await deactivateExpiredCargoPosts();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts = await (prisma.cargoPost.findMany as any)({
    where: publicApprovedCargoPostWhere(),
    select: { ...publicListingSelect, translations: true },
    orderBy: { createdAt: "desc" },
  }) as PublicCargoPost[];

  return posts.map(mapCargoPostToPublicListing);
}

export async function getPublicListingByIdFromPostgres(id: string): Promise<CargoListing | null> {
  await deactivateExpiredCargoPosts();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const post = await (prisma.cargoPost.findFirst as any)({
    where: {
      AND: [listingIdWhere(id), publicApprovedCargoPostWhere()],
    },
    select: { ...publicListingSelect, translations: true },
  }) as PublicCargoPost | null;

  if (!post) {
    return null;
  }

  await prisma.cargoPost.update({
    where: { id: post.id },
    data: { legacyViewCount: { increment: 1 } },
  });

  return mapCargoPostToPublicListing({
    ...post,
    legacyViewCount: post.legacyViewCount + 1,
  });
}
