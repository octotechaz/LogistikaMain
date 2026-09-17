import { fail, ok, parseZodError, publicUser } from "@/lib/api";
import { authCookieName } from "@/lib/auth";
import { authCookieSetOptions } from "@/lib/auth-cookie";
import { canonicalizeLoginPhone, phoneLookupCandidates } from "@/lib/login-identity";
import { signAuthToken } from "@/lib/jwt";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { dashboardPathForRole } from "@/lib/role-redirect";
import { cargoOwnerRegisterSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const payload = cargoOwnerRegisterSchema.parse(await request.json());
    const phone = canonicalizeLoginPhone(payload.phone);
    if (!phone) {
      return fail("Telefon nömrəsini düzgün daxil edin.", 400);
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: payload.email.toLowerCase() },
          { phone: { in: phoneLookupCandidates(phone) } },
        ],
      },
    });

    if (existingUser) {
      return fail("Bu email və ya telefonla hesab artıq mövcuddur.", 409);
    }

    const user = await prisma.user.create({
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone,
        email: payload.email.toLowerCase(),
        passwordHash: await hashPassword(payload.password),
        role: "CARGO_OWNER",
        companyName: payload.companyName || null,
        cargoOwnerProfile: {
          create: {
            companyName: payload.companyName || null,
            voen: payload.voen || null,
            city: payload.city || null,
          },
        },
      },
      include: { cargoOwnerProfile: true },
    });

    const token = await signAuthToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    const response = ok({
      redirectTo: dashboardPathForRole(user.role),
      user: publicUser(user),
    });

    response.cookies.set(authCookieName, token, authCookieSetOptions());

    return response;
  } catch (error) {
    return fail("Yük verən qeydiyyat məlumatlarını yoxlayın.", 400, parseZodError(error));
  }
}
