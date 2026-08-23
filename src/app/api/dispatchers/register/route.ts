
import { fail, ok, parseZodError } from "@/lib/api";
import { generatedRoleEmail } from "@/lib/operator-utils";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { dispatcherRegisterSchema } from "@/lib/validations/operator-profiles";

export async function POST(request: Request) {
  try {
    const payload = dispatcherRegisterSchema.parse(await request.json());
    const email = generatedRoleEmail("dispatcher", payload.phone);
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
        role: "DISPATCHER",
        companyName: payload.companyName,
        dispatcherProfile: {
          create: {
            whatsappPhone: payload.whatsappPhone,
            companyName: payload.companyName,
            vehicleCount: payload.vehicleCount,
            vehicleTypes: payload.vehicleTypes,
            routes: payload.routes,
            note: payload.note || null,
            status: "ACTIVE"
          }
        }
      },
      include: { dispatcherProfile: true }
    });

    return ok({ userId: user.id, profileId: user.dispatcherProfile?.id }, { status: 201 });
  } catch (error) {
    return fail("Dispetçer qeydiyyat məlumatlarını yoxlayın.", 400, parseZodError(error));
  }
}
