import "server-only";

import type { Prisma } from "@prisma/client";
import { activeCargoPostWhere, deactivateExpiredCargoPosts } from "@/lib/cargo-post-expiration";
import { prisma } from "@/lib/prisma";
import { publicUserSelect } from "@/lib/prisma-selects";
import type { CargoListing } from "@/types/classifieds";

const publicListingInclude = {
  images: {
    orderBy: { createdAt: "asc" as const },
    select: { url: true },
  },
  owner: { select: publicUserSelect },
  cargoOwnerProfile: {
    select: {
      companyName: true,
      user: { select: publicUserSelect },
    },
  },
} satisfies Prisma.CargoPostInclude;

type PublicCargoPost = Prisma.CargoPostGetPayload<{ include: typeof publicListingInclude }>;

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

  const posts = await prisma.cargoPost.findMany({
    where: publicApprovedCargoPostWhere(),
    include: publicListingInclude,
    orderBy: { createdAt: "desc" },
  });

  return posts.map(mapCargoPostToPublicListing);
}

export async function getPublicListingByIdFromPostgres(id: string): Promise<CargoListing | null> {
  await deactivateExpiredCargoPosts();

  const post = await prisma.cargoPost.findFirst({
    where: {
      AND: [listingIdWhere(id), publicApprovedCargoPostWhere()],
    },
    include: publicListingInclude,
  });

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
