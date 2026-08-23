
import { prisma } from "@/lib/prisma";
import { fail, ok, parseZodError, requireApiUser } from "@/lib/api";
import { deactivateExpiredCargoPosts, isCargoPostEffectivelyActive } from "@/lib/cargo-post-expiration";
import { notifyCargoOwnerNewApplication } from "@/lib/cargo-owner-whatsapp-notify";
import { createNotification } from "@/lib/notifications";
import { numberOrNull } from "@/lib/normalize";
import { publicUserSelect } from "@/lib/prisma-selects";
import { applicationCreateSchema } from "@/lib/validations/application";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request, ["CARRIER", "CARGO_OWNER", "ADMIN"]);

  if (response) {
    return response;
  }

  if (!user) {
    return fail("Giriş tələb olunur.", 401);
  }

  const applications = await prisma.cargoApplication.findMany({
    where:
      user.role === "CARRIER"
        ? {
            carrierId: user.id
          }
        : user.role === "CARGO_OWNER"
          ? {
              cargoPost: {
                ownerId: user.id
              }
            }
          : undefined,
    include: {
      cargoPost: true,
      vehicle: true,
      carrierProfile: {
        include: {
          user: { select: publicUserSelect }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return ok(applications);
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(request, ["CARRIER"]);

  if (response) {
    return response;
  }

  if (!user?.carrierProfile) {
    return fail("Daşıyıcı profili tapılmadı.", 403);
  }

  try {
    await deactivateExpiredCargoPosts();
    const payload = applicationCreateSchema.parse(await request.json());

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: payload.vehicleId,
        carrierProfileId: user.carrierProfile.id
      }
    });

    if (!vehicle) {
      return fail("Seçilən avtomobil sizə aid deyil.", 403);
    }

    if (vehicle.status !== "APPROVED") {
      return fail("Yalnız təsdiqlənmiş avtomobil ilə müraciət etmək olar.", 400);
    }

    const cargoPost = await prisma.cargoPost.findUnique({
      where: { id: payload.cargoPostId },
      include: {
        cargoOwnerProfile: {
          include: {
            user: { select: publicUserSelect }
          }
        }
      }
    });

    if (!cargoPost || !isCargoPostEffectivelyActive(cargoPost)) {
      return fail("Bu yük elanı artıq aktiv deyil.", 400);
    }

    const application = await prisma.cargoApplication.create({
      data: {
        cargoPostId: payload.cargoPostId,
        carrierId: user.id,
        carrierProfileId: user.carrierProfile.id,
        vehicleId: payload.vehicleId,
        message: payload.message || null,
        offeredPrice: numberOrNull(payload.offeredPrice)
      },
      include: {
        cargoPost: true,
        vehicle: true,
        carrierProfile: {
          include: {
            user: { select: publicUserSelect }
          }
        }
      }
    });

    await createNotification({
      userId: cargoPost.cargoOwnerProfile.userId,
      title: "Yeni müraciət var",
      message: `${user.firstName} ${user.lastName} "${cargoPost.cargoName}" yükünə müraciət etdi.`,
      type: "APPLICATION_CREATED"
    });

    const ownerPhone =
      cargoPost.contactPhone?.trim() || cargoPost.cargoOwnerProfile.user.phone?.trim() || "";
    const carrierPhone =
      user.carrierProfile.whatsappPhone?.trim() || user.phone?.trim() || application.vehicle.driverPhone;

    try {
      await notifyCargoOwnerNewApplication({
        applicationId: application.id,
        listingId: cargoPost.id,
        ownerPhone,
        cargoName: cargoPost.cargoName,
        cargoType: cargoPost.cargoType,
        pickupCity: cargoPost.pickupCity,
        deliveryCity: cargoPost.deliveryCity,
        pickupDate: cargoPost.pickupDate,
        weight: cargoPost.weight,
        volume: cargoPost.volume,
        quantity: cargoPost.quantity,
        proposedPrice: cargoPost.proposedPrice?.toString() ?? null,
        priceNegotiable: cargoPost.priceNegotiable,
        offeredPrice: application.offeredPrice?.toString() ?? null,
        applicationMessage: application.message,
        carrierName: `${user.firstName} ${user.lastName}`.trim(),
        carrierPhone,
        vehicleType: application.vehicle.vehicleType,
        vehicleBrand: application.vehicle.brand,
        vehicleModel: application.vehicle.model,
        vehiclePlate: application.vehicle.plateNumber,
        driverName: `${application.vehicle.driverFirstName} ${application.vehicle.driverLastName}`.trim(),
        driverPhone: application.vehicle.driverPhone,
        vehicleCapacityTons: application.vehicle.capacityTons,
      });
    } catch (waError) {
      console.error("Cargo owner WhatsApp notification failed:", waError);
    }

    return ok(application, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return fail("Bu yük elanına artıq müraciət etmisiniz.", 409);
    }

    return fail("Müraciət məlumatlarını yoxlayın.", 400, parseZodError(error));
  }
}
