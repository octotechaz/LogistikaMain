
import { Role } from "@prisma/client";
import { z } from "zod";
import { fail, ok, parseZodError, publicUser } from "@/lib/api";
import { authCookieName } from "@/lib/auth";
import { authCookieSetOptions } from "@/lib/auth-cookie";
import { signAuthToken } from "@/lib/jwt";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { dashboardPathForRole } from "@/lib/role-redirect";
import { carrierRegisterSchema, registerSchema } from "@/lib/validations/auth";
import { buildCarrierProfileCreateData } from "@/lib/carrier-profile-create";

const restrictedPublicRegisterRoles = [
  Role.ADMIN,
  Role.OPERATOR,
  Role.DRIVER,
  Role.DISPATCHER,
] as const;

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    const basePayload = registerSchema.parse(requestBody);
    const role = z.nativeEnum(Role).parse(basePayload.role);

    if (restrictedPublicRegisterRoles.some((r) => r === role)) {
      return fail("Bu rol üçün hesab yalnız uyğun qeydiyyat axını və ya admin tərəfindən yaradılmalıdır.", 403);
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: basePayload.email.toLowerCase() }, { phone: basePayload.phone }]
      }
    });

    if (existingUser) {
      return fail("Bu email və ya telefonla hesab artıq mövcuddur.", 409);
    }

    if (role === Role.CARRIER) {
      const payload = carrierRegisterSchema.parse(requestBody);
      const user = await prisma.user.create({
        data: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: payload.phone,
          email: payload.email.toLowerCase(),
          passwordHash: await hashPassword(payload.password),
          role: Role.CARRIER,
          companyName: payload.companyName || null,
          carrierProfile: {
            create: buildCarrierProfileCreateData(payload)
          }
        }
      });

      const token = await signAuthToken({
        sub: user.id,
        role: user.role,
        email: user.email
      });

      const response = ok({
        redirectTo: dashboardPathForRole(user.role),
        user: publicUser(user)
      });

      response.cookies.set(authCookieName, token, authCookieSetOptions());

      return response;
    }

    const user = await prisma.user.create({
      data: {
        firstName: basePayload.firstName,
        lastName: basePayload.lastName,
        phone: basePayload.phone,
        email: basePayload.email.toLowerCase(),
        passwordHash: await hashPassword(basePayload.password),
        role,
        companyName: basePayload.companyName || null,
        cargoOwnerProfile:
          role === Role.CARGO_OWNER
            ? {
                create: {
                  companyName: basePayload.companyName || null
                }
              }
            : undefined
      }
    });

    const token = await signAuthToken({
      sub: user.id,
      role: user.role,
      email: user.email
    });

    const response = ok({
      redirectTo: dashboardPathForRole(user.role),
      user: publicUser(user)
    });

    response.cookies.set(authCookieName, token, authCookieSetOptions());

    return response;
  } catch (error) {
    return fail("Qeydiyyat məlumatlarını yoxlayın.", 400, parseZodError(error));
  }
}
