
import { fail, ok, parseZodError, requireApiUser } from "@/lib/api";
import { validateCargoMeasurements } from "@/lib/cargo-measurements";
import { prisma } from "@/lib/prisma";
import { publicUserSelect } from "@/lib/prisma-selects";
import { loadCreateSchema } from "@/lib/validations/operator-load";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request, ["CARGO_OWNER", "OPERATOR", "ADMIN"]);

  if (response) return response;

  const loads = await prisma.load.findMany({
    where: user?.role === "CARGO_OWNER" ? { cargoOwnerId: user.id } : undefined,
    include: {
      cargoOwner: { select: publicUserSelect },
      assignedDriver: { include: { user: { select: publicUserSelect } } },
      assignedDispatcher: { include: { user: { select: publicUserSelect } } },
      contactAttempts: true
    },
    orderBy: { createdAt: "desc" }
  });

  return ok(loads);
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(request, ["CARGO_OWNER"]);

  if (response) return response;

  if (!user?.cargoOwnerProfile) {
    return fail("Yük verən profili tapılmadı.", 403);
  }

  try {
    const payload = loadCreateSchema.parse(await request.json());
    const measurements = validateCargoMeasurements(payload);

    const load = await prisma.load.create({
      data: {
        cargoOwnerId: user.id,
        cargoOwnerProfileId: user.cargoOwnerProfile.id,
        title: payload.title,
        cargoType: payload.cargoType,
        description: payload.description,
        weight: payload.weight,
        volume: measurements.volume,
        length: measurements.length,
        width: measurements.width,
        height: measurements.height,
        quantity: measurements.quantityValid ? String(measurements.quantity) : null,
        pickupCity: payload.pickupCity,
        deliveryCity: payload.deliveryCity,
        pickupAddress: payload.pickupAddress,
        deliveryAddress: payload.deliveryAddress,
        pickupDate: payload.pickupDate,
        pickupTime: payload.pickupTime || null,
        requiredVehicleType: payload.requiredVehicleType,
        priceFrom: payload.priceFrom,
        priceTo: payload.priceTo,
        isNegotiable: payload.isNegotiable,
        contactPhone: payload.contactPhone,
        note: payload.note || null,
        status: "NEW"
      },
      include: {
        cargoOwner: { select: publicUserSelect }
      }
    });

    return ok(load, { status: 201 });
  } catch (error) {
    return fail("Yük məlumatlarını yoxlayın.", 400, parseZodError(error));
  }
}
