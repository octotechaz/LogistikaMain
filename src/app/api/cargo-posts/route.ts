
import { ImageCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseZodError, requireApiUser } from "@/lib/api";
import { activeCargoPostWhere, deactivateExpiredCargoPosts } from "@/lib/cargo-post-expiration";
import { numberOrNull } from "@/lib/normalize";
import {
  calculateExpiresAtFromPickupDeadline,
  normalizePickupDeadlineDateValue,
  pickupDeadlineDateToDate
} from "@/lib/pickup-deadline";
import { publicUserSelect } from "@/lib/prisma-selects";
import { validateCargoMeasurements } from "@/lib/cargo-measurements";
import { cargoPostSchema } from "@/lib/validations/cargo-post";
import { notifyAdminsPendingCargo } from "@/lib/admin-whatsapp-notify";
import { allocateLegacySqliteId } from "@/lib/cargo-legacy-id";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request, ["CARRIER", "CARGO_OWNER", "ADMIN"]);

  if (response) {
    return response;
  }

  if (!user) {
    return fail("Giriş tələb olunur.", 401);
  }

  await deactivateExpiredCargoPosts();

  const cargoPosts = await prisma.cargoPost.findMany({
    where:
      user.role === "CARRIER"
        ? activeCargoPostWhere()
        : user.role === "CARGO_OWNER"
          ? {
              ownerId: user.id
            }
          : undefined,
    include: {
      images: true,
      applications: true,
      cargoOwnerProfile: {
        include: {
          user: { select: publicUserSelect }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return ok(cargoPosts);
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(request, ["CARGO_OWNER"]);

  if (response) {
    return response;
  }

  if (!user?.cargoOwnerProfile) {
    return fail("Yük sahibi profili tapılmadı.", 403);
  }

  try {
    const payload = cargoPostSchema.parse(await request.json());
    const measurements = validateCargoMeasurements(payload);
    const pickupDeadlineDateValue = normalizePickupDeadlineDateValue(payload.pickupDeadlineDate);
    const pickupDeadlineDate = pickupDeadlineDateToDate(pickupDeadlineDateValue);
    const pickupDate = payload.pickupDate ?? pickupDeadlineDate;
    const expiresAt = calculateExpiresAtFromPickupDeadline(pickupDeadlineDateValue);
    const legacySqliteId = await allocateLegacySqliteId();
    const cargoPost = await prisma.cargoPost.create({
      data: {
        legacySqliteId,
        ownerId: user.id,
        cargoOwnerProfileId: user.cargoOwnerProfile.id,
        cargoName: payload.cargoName,
        cargoType: payload.cargoType,
        description: payload.description,
        weight: payload.weight,
        volume: measurements.volume,
        length: measurements.length,
        width: measurements.width,
        height: measurements.height,
        quantity: measurements.quantityValid ? String(measurements.quantity) : null,
        pickupAddress: payload.pickupAddress,
        deliveryAddress: payload.deliveryAddress,
        pickupCity: payload.pickupCity,
        deliveryCity: payload.deliveryCity,
        pickupDate,
        pickupDeadlineDate,
        expiresAt,
        requiredVehicleType: payload.requiredVehicleType,
        proposedPrice: numberOrNull(payload.proposedPrice),
        priceNegotiable: payload.priceNegotiable,
        contactPhone: payload.contactPhone,
        needsLoadingHelp: payload.needsLoadingHelp || null,
        needsUnloadingHelp: payload.needsUnloadingHelp || null,
        requiresInvoice: payload.requiresInvoice || null,
        roundTrip: payload.roundTrip || null,
        legacyPickupTime: payload.legacyPickupTime || null,
        legacyNote: payload.legacyNote || null,
        // New listings stay off the public catalog until an admin approves.
        legacyAdminStatus: "PENDING",
        status: "CANCELLED",
        images: {
          create: payload.imageUrls.map((url) => ({
            url,
            category: ImageCategory.CARGO,
            userId: user.id
          }))
        }
      },
      include: { images: true }
    });

    try {
      await notifyAdminsPendingCargo({
        listingId: cargoPost.id,
        listingNumber: cargoPost.legacySqliteId ?? cargoPost.id,
        title: cargoPost.cargoName,
        cargoType: cargoPost.cargoType,
        pickupCity: cargoPost.pickupCity,
        deliveryCity: cargoPost.deliveryCity,
        contactPhone: cargoPost.contactPhone,
        ownerName: user.cargoOwnerProfile.companyName || `${user.firstName} ${user.lastName}`.trim(),
      });
    } catch (notifyError) {
      console.error("Admin WhatsApp bildirişi göndərilmədi:", notifyError);
    }

    return ok(cargoPost, { status: 201 });
  } catch (error) {
    return fail("Yük elanı məlumatlarını yoxlayın.", 400, parseZodError(error));
  }
}
