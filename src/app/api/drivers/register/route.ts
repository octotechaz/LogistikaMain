
import { fail, ok, parseZodError } from "@/lib/api";
import { generatedRoleEmail } from "@/lib/operator-utils";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { driverRegisterSchema } from "@/lib/validations/operator-profiles";

export async function POST(request: Request) {
  try {
    const payload = driverRegisterSchema.parse(await request.json());
    const email = generatedRoleEmail("driver", payload.phone);
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone: payload.phone }]
      }
    });

    if (existingUser) {
      return fail("Bu telefonla istifadəçi artıq qeydiyyatdan keçib.", 409);
    }

    const user = await prisma.user.create({
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        email,
        passwordHash: await hashPassword(crypto.randomUUID()),
        role: "DRIVER",
        driverProfile: {
          create: {
            whatsappPhone: payload.whatsappPhone,
            city: payload.city,
            vehicleType: payload.vehicleType,
            brand: payload.brand,
            model: payload.model,
            plateNumber: payload.plateNumber,
            capacityTons: payload.capacityTons,
            bodyLength: payload.bodyLength,
            bodyWidth: payload.bodyWidth,
            bodyHeight: payload.bodyHeight,
            workingDays: payload.workingDays,
            workingHours: payload.workingHours,
            routes: payload.routes,
            notificationChannels: payload.notificationChannels,
            consentToReceiveOffers: payload.consentToReceiveOffers,
            status: "ACTIVE"
          }
        }
      },
      include: { driverProfile: true }
    });

    return ok({ userId: user.id, profileId: user.driverProfile?.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return fail("Bu dövlət nömrəsi və ya telefon artıq qeydiyyatdan keçib.", 409);
    }

    return fail("Sürücü qeydiyyat məlumatlarını yoxlayın.", 400, parseZodError(error));
  }
}
