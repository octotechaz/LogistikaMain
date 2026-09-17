
import { fail, ok, parseZodError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { publicUserSelect } from "@/lib/prisma-selects";
import { dispatcherProfileUpdateSchema } from "@/lib/validations/operator-profiles";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request, ["DISPATCHER"]);

  if (response) return response;
  if (!user?.dispatcherProfile) return fail("Dispetçer profili tapılmadı.", 404);

  const profile = await prisma.dispatcherProfile.findUnique({
    where: { id: user.dispatcherProfile.id },
    include: { user: { select: publicUserSelect } }
  });

  return ok(profile);
}

export async function PATCH(request: Request) {
  const { user, response } = await requireApiUser(request, ["DISPATCHER"]);

  if (response) return response;
  if (!user?.dispatcherProfile) return fail("Dispetçer profili tapılmadı.", 404);

  try {
    const payload = dispatcherProfileUpdateSchema.parse(await request.json());
    const { firstName, lastName, phone, ...profilePayload } = payload;

    if (firstName || lastName || phone || profilePayload.companyName) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName,
          lastName,
          phone,
          companyName: profilePayload.companyName
        }
      });
    }

    const profile = await prisma.dispatcherProfile.update({
      where: { id: user.dispatcherProfile.id },
      data: {
        whatsappPhone: profilePayload.whatsappPhone,
        companyName: profilePayload.companyName,
        vehicleCount: profilePayload.vehicleCount,
        vehicleTypes: profilePayload.vehicleTypes,
        routes: profilePayload.routes,
        note: profilePayload.note
      },
      include: { user: { select: publicUserSelect } }
    });

    return ok(profile);
  } catch (error) {
    return fail("Dispetçer profil məlumatlarını yoxlayın.", 400, parseZodError(error));
  }
}
