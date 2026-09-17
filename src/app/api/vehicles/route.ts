
import { ImageCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseZodError, requireApiUser } from "@/lib/api";
import { publicUserSelect } from "@/lib/prisma-selects";
import { vehicleSchema } from "@/lib/validations/vehicle";
import { createNotification } from "@/lib/notifications";
import { VehicleStatus } from "@prisma/client";
import { notifyAdminsPendingVehicle } from "@/lib/admin-whatsapp-notify";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request, ["CARRIER", "ADMIN"]);

  if (response) {
    return response;
  }

  if (!user) {
    return fail("Giriş tələb olunur.", 401);
  }

  const vehicles = await prisma.vehicle.findMany({
    where:
      user.role === "CARRIER"
        ? {
            carrierId: user.id
          }
        : undefined,
    include: {
      images: true,
      carrierProfile: {
        include: {
          user: { select: publicUserSelect }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return ok(vehicles);
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
    const payload = vehicleSchema.parse(await request.json());

    const vehicle = await prisma.vehicle.create({
      data: {
        carrierId: user.id,
        carrierProfileId: user.carrierProfile.id,
        vehicleType: payload.vehicleType,
        brand: payload.brand,
        model: payload.model,
        plateNumber: payload.plateNumber,
        driverFirstName: payload.driverFirstName,
        driverLastName: payload.driverLastName,
        driverPhone: payload.driverPhone,
        capacityTons: payload.capacityTons,
        bodyLength: payload.bodyLength,
        bodyWidth: payload.bodyWidth,
        bodyHeight: payload.bodyHeight,
        overallDimensions: payload.overallDimensions,
        workDays: payload.workDays,
        workHours: payload.workHours,
        serviceAreas: payload.serviceAreas,
        images: {
          create: [
            ...payload.imageUrls.map((url) => ({
              url,
              category: ImageCategory.VEHICLE,
              userId: user.id
            })),
            ...payload.documentImageUrls.map((url) => ({
              url,
              category: ImageCategory.VEHICLE_DOCUMENT,
              userId: user.id
            }))
          ]
        }
      },
      include: {
        images: true
      }
    });

    // Carriers create vehicles in PENDING state; admins must approve.
    // Notify all admin users so the pending queue becomes visible.
    if (vehicle.status === VehicleStatus.PENDING) {
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true }
      });

      await Promise.all(
        admins.map((admin) =>
          createNotification({
            userId: admin.id,
            title: "Avtomobil təsdiqi gözləyir",
            message: `${vehicle.brand} ${vehicle.model} avtomobili admin təsdiqi gözləyir.`,
            // No dedicated NotificationType for pending; use SYSTEM.
            type: undefined
          })
        )
      );

      try {
        await notifyAdminsPendingVehicle({
          vehicleId: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          plateNumber: vehicle.plateNumber,
          vehicleType: vehicle.vehicleType,
          driverPhone: vehicle.driverPhone,
          carrierName: `${user.firstName} ${user.lastName}`.trim(),
        });
      } catch (waError) {
        console.error("Admin vehicle WhatsApp notification failed:", waError);
      }
    }

    return ok(vehicle, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return fail("Bu dövlət nömrə nişanı ilə avtomobil artıq mövcuddur.", 409);
    }

    return fail("Avtomobil məlumatlarını yoxlayın.", 400, parseZodError(error));
  }
}
