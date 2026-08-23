
import { ImageCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseZodError, requireApiUser } from "@/lib/api";
import { deactivateExpiredCargoPosts } from "@/lib/cargo-post-expiration";
import { normalizeQuantityValue, validateCargoMeasurements } from "@/lib/cargo-measurements";
import {
  calculateExpiresAtFromPickupDeadline,
  normalizePickupDeadlineDateValue,
  pickupDeadlineDateToDate
} from "@/lib/pickup-deadline";
import { cargoPostSchema } from "@/lib/validations/cargo-post";

const OWNER_EDIT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function buildEditSnapshot(existingCargoPost: {
  cargoName: string;
  cargoType: string;
  description: string;
  weight: number;
  volume: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  quantity: string | null;
  pickupAddress: string;
  deliveryAddress: string;
  pickupCity: string | null;
  deliveryCity: string | null;
  pickupDate: Date;
  pickupDeadlineDate: Date | null;
  requiredVehicleType: string | null;
  proposedPrice: { toString(): string } | null;
  priceNegotiable: boolean | string | null;
  contactPhone: string | null;
  needsLoadingHelp: boolean | string | null;
  needsUnloadingHelp: boolean | string | null;
  requiresInvoice: boolean | string | null;
  roundTrip: boolean | string | null;
  legacyPickupTime: string | null;
  legacyNote: string | null;
  images: Array<{ url: string }>;
}) {
  return {
    at: new Date().toISOString(),
    fields: {
      cargoName: existingCargoPost.cargoName,
      cargoType: existingCargoPost.cargoType,
      description: existingCargoPost.description,
      weight: existingCargoPost.weight,
      volume: existingCargoPost.volume,
      length: existingCargoPost.length,
      width: existingCargoPost.width,
      height: existingCargoPost.height,
      quantity: existingCargoPost.quantity,
      pickupAddress: existingCargoPost.pickupAddress,
      deliveryAddress: existingCargoPost.deliveryAddress,
      pickupCity: existingCargoPost.pickupCity,
      deliveryCity: existingCargoPost.deliveryCity,
      pickupDate: existingCargoPost.pickupDate.toISOString(),
      pickupDeadlineDate: existingCargoPost.pickupDeadlineDate?.toISOString() ?? null,
      requiredVehicleType: existingCargoPost.requiredVehicleType,
      proposedPrice: existingCargoPost.proposedPrice?.toString() ?? null,
      priceNegotiable: existingCargoPost.priceNegotiable,
      contactPhone: existingCargoPost.contactPhone,
      needsLoadingHelp: existingCargoPost.needsLoadingHelp,
      needsUnloadingHelp: existingCargoPost.needsUnloadingHelp,
      requiresInvoice: existingCargoPost.requiresInvoice,
      roundTrip: existingCargoPost.roundTrip,
      legacyPickupTime: existingCargoPost.legacyPickupTime,
      legacyNote: existingCargoPost.legacyNote
    },
    imageUrls: existingCargoPost.images.map((image) => image.url)
  };
}

async function findAuthorizedCargoPost(id: string, userId: string) {
  return prisma.cargoPost.findFirst({
    where: {
      id,
      ownerId: userId
    }
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request, ["CARGO_OWNER", "ADMIN"]);

  if (response) {
    return response;
  }

  if (!user) {
    return fail("Giriş tələb olunur.", 401);
  }

  const { id } = await params;

  if (user.role === "CARGO_OWNER") {
    const cargoPost = await findAuthorizedCargoPost(id, user.id);

    if (!cargoPost) {
      return fail("Bu elanı redaktə etmək icazəniz yoxdur.", 403);
    }
  }

  try {
    await deactivateExpiredCargoPosts();
    const requestBody = await request.json();
    const existingCargoPost = await prisma.cargoPost.findUnique({
      where: { id },
      include: { images: true }
    });

    if (!existingCargoPost) {
      return fail("Yük elanı tapılmadı.", 404);
    }

    const ownerResubmit = user.role === "CARGO_OWNER";
    const wasPublished =
      existingCargoPost.legacyAdminStatus === "APPROVED" ||
      existingCargoPost.lastEditedAt !== null ||
      existingCargoPost.editSnapshot !== null;

    if (ownerResubmit && wasPublished) {
      if (
        existingCargoPost.lastEditedAt &&
        Date.now() - existingCargoPost.lastEditedAt.getTime() < OWNER_EDIT_COOLDOWN_MS
      ) {
        return fail("Bu elan 24 saat ərzində yalnız 1 dəfə redaktə edilə bilər.", 429);
      }
    }

    const payload = cargoPostSchema.parse({
      cargoName: requestBody.cargoName ?? existingCargoPost.cargoName,
      cargoType: requestBody.cargoType ?? existingCargoPost.cargoType,
      description: requestBody.description ?? existingCargoPost.description,
      weight: requestBody.weight ?? existingCargoPost.weight,
      volume: requestBody.volume ?? existingCargoPost.volume,
      length: requestBody.length ?? existingCargoPost.length,
      width: requestBody.width ?? existingCargoPost.width,
      height: requestBody.height ?? existingCargoPost.height,
      quantity: requestBody.quantity ?? normalizeQuantityValue(existingCargoPost.quantity),
      pickupAddress: requestBody.pickupAddress ?? existingCargoPost.pickupAddress,
      deliveryAddress: requestBody.deliveryAddress ?? existingCargoPost.deliveryAddress,
      pickupCity: requestBody.pickupCity ?? existingCargoPost.pickupCity,
      deliveryCity: requestBody.deliveryCity ?? existingCargoPost.deliveryCity,
      pickupDate: requestBody.pickupDate ?? existingCargoPost.pickupDate,
      pickupDeadlineDate:
        requestBody.pickupDeadlineDate ??
        existingCargoPost.pickupDeadlineDate ??
        existingCargoPost.pickupDate,
      requiredVehicleType: requestBody.requiredVehicleType ?? existingCargoPost.requiredVehicleType,
      proposedPrice: requestBody.proposedPrice ?? existingCargoPost.proposedPrice?.toString() ?? "",
      priceNegotiable: requestBody.priceNegotiable ?? existingCargoPost.priceNegotiable,
      contactPhone: requestBody.contactPhone ?? existingCargoPost.contactPhone,
      needsLoadingHelp: requestBody.needsLoadingHelp ?? existingCargoPost.needsLoadingHelp ?? undefined,
      needsUnloadingHelp: requestBody.needsUnloadingHelp ?? existingCargoPost.needsUnloadingHelp ?? undefined,
      requiresInvoice: requestBody.requiresInvoice ?? existingCargoPost.requiresInvoice ?? undefined,
      roundTrip: requestBody.roundTrip ?? existingCargoPost.roundTrip ?? undefined,
      legacyPickupTime: requestBody.legacyPickupTime ?? existingCargoPost.legacyPickupTime ?? undefined,
      legacyNote: requestBody.legacyNote ?? existingCargoPost.legacyNote ?? undefined,
      categoryId: requestBody.categoryId ?? existingCargoPost.categoryId ?? undefined,
      imageUrls: requestBody.imageUrls ?? existingCargoPost.images.map((image) => image.url)
    });
    const measurements = validateCargoMeasurements(payload);
    const pickupDeadlineDateValue = normalizePickupDeadlineDateValue(payload.pickupDeadlineDate);
    const pickupDeadlineDate = pickupDeadlineDateToDate(pickupDeadlineDateValue);
    const expiresAt = calculateExpiresAtFromPickupDeadline(pickupDeadlineDateValue);
    const { imageUrls, ...cargoPostData } = payload;
    const cargoPost = await prisma.cargoPost.update({
      where: { id },
      data: {
        ...cargoPostData,
        pickupDate: payload.pickupDate ?? existingCargoPost.pickupDate,
        pickupDeadlineDate,
        expiresAt,
        volume: measurements.volume,
        length: measurements.length,
        width: measurements.width,
        height: measurements.height,
        quantity: measurements.quantityValid ? String(measurements.quantity) : null,
        proposedPrice:
          payload.proposedPrice === undefined ? undefined : payload.proposedPrice === null ? null : Number(payload.proposedPrice),
        // Owner edits go back to admin review before publishing again.
        ...(ownerResubmit
          ? {
              legacyAdminStatus: "PENDING",
              status: "CANCELLED" as const,
              deactivatedAt: null,
              ...(wasPublished
                ? {
                    lastEditedAt: new Date(),
                    editSnapshot: buildEditSnapshot(existingCargoPost)
                  }
                : {})
            }
          : {}),
        images: imageUrls
          ? {
              deleteMany: {},
              create: imageUrls.map((url) => ({
                url,
                category: ImageCategory.CARGO,
                userId: user.id
              }))
            }
          : undefined
      },
      include: {
        images: true
      }
    });

    return ok(cargoPost);
  } catch (error) {
    return fail("Yük elanı yenilənmədi.", 400, parseZodError(error));
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request, ["CARGO_OWNER", "ADMIN"]);

  if (response) {
    return response;
  }

  if (!user) {
    return fail("Giriş tələb olunur.", 401);
  }

  const { id } = await params;

  if (user.role === "CARGO_OWNER") {
    const cargoPost = await findAuthorizedCargoPost(id, user.id);

    if (!cargoPost) {
      return fail("Bu elanı silmək icazəniz yoxdur.", 403);
    }
  }

  await prisma.cargoPost.update({
    where: { id },
    data: {
      status: "CANCELLED",
      deactivatedAt: new Date()
    }
  });

  return ok({ cancelled: true });
}
