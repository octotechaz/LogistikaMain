
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
      imageUrls: requestBody.imageUrls ?? existingCargoPost.images.map((image) => image.url)
    });
    const measurements = validateCargoMeasurements(payload);
    const pickupDeadlineDateValue = normalizePickupDeadlineDateValue(payload.pickupDeadlineDate);
    const pickupDeadlineDate = pickupDeadlineDateToDate(pickupDeadlineDateValue);
    const expiresAt = calculateExpiresAtFromPickupDeadline(pickupDeadlineDateValue);
    const { imageUrls, ...cargoPostData } = payload;
    const ownerResubmit = user.role === "CARGO_OWNER";
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
              deactivatedAt: null
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
