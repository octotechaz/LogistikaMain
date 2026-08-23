
import { fail, ok, parseZodError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { publicUserSelect } from "@/lib/prisma-selects";
import { driverProfileUpdateSchema } from "@/lib/validations/operator-profiles";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request, ["DRIVER"]);

  if (response) return response;
  if (!user?.driverProfile) return fail("Sürücü profili tapılmadı.", 404);

  const profile = await prisma.driverProfile.findUnique({
    where: { id: user.driverProfile.id },
    include: { user: { select: publicUserSelect } }
  });

  return ok(profile);
}

export async function PATCH(request: Request) {
  const { user, response } = await requireApiUser(request, ["DRIVER"]);

  if (response) return response;
  if (!user?.driverProfile) return fail("Sürücü profili tapılmadı.", 404);

  try {
    const payload = driverProfileUpdateSchema.parse(await request.json());
    const { firstName, lastName, phone, ...profilePayload } = payload;

    if (firstName || lastName || phone) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName,
          lastName,
          phone
        }
      });
    }

    const profile = await prisma.driverProfile.update({
      where: { id: user.driverProfile.id },
      data: {
        whatsappPhone: profilePayload.whatsappPhone,
        city: profilePayload.city,
        vehicleType: profilePayload.vehicleType,
        brand: profilePayload.brand,
        model: profilePayload.model,
        plateNumber: profilePayload.plateNumber,
        capacityTons: profilePayload.capacityTons,
        bodyLength: profilePayload.bodyLength,
        bodyWidth: profilePayload.bodyWidth,
        bodyHeight: profilePayload.bodyHeight,
        workingDays: profilePayload.workingDays,
        workingHours: profilePayload.workingHours,
        routes: profilePayload.routes,
        notificationChannels: profilePayload.notificationChannels,
        consentToReceiveOffers: profilePayload.consentToReceiveOffers
      },
      include: { user: { select: publicUserSelect } }
    });

    return ok(profile);
  } catch (error) {
    return fail("Sürücü profil məlumatlarını yoxlayın.", 400, parseZodError(error));
  }
}
