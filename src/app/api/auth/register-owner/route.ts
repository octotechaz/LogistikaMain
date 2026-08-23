import { fail, ok, parseZodError, publicUser } from "@/lib/api";
import { authCookieName } from "@/lib/auth";
import { authCookieSetOptions } from "@/lib/auth-cookie";
import { canonicalizeLoginPhone, phoneLookupCandidates } from "@/lib/login-identity";
import { signAuthToken } from "@/lib/jwt";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { dashboardPathForRole } from "@/lib/role-redirect";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ownerRegisterBodySchema = z.object({
  firstName: z.string().trim().min(2, "Ad ən azı 2 simvol olmalıdır."),
  lastName: z.string().trim().min(2, "Soyad ən azı 2 simvol olmalıdır."),
  phone: z.string().trim().min(7, "Telefon nömrəsi mütləqdir."),
  password: z.string().min(8, "Şifrə minimum 8 simvol olmalıdır."),
  companyName: z.string().trim().optional().or(z.literal("")),
  taxId: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const payload = ownerRegisterBodySchema.parse(await request.json());
    const phone = canonicalizeLoginPhone(payload.phone);
    if (!phone) {
      return fail("Telefon nömrəsini düzgün daxil edin.", 400);
    }

    const phoneCandidates = phoneLookupCandidates(phone);
    const email =
      payload.email && payload.email.length > 0
        ? payload.email.toLowerCase()
        : `${phone}@tranzit.az`;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone: { in: phoneCandidates } }],
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
        email,
        passwordHash: await hashPassword(payload.password),
        role: "CARGO_OWNER",
        companyName: payload.companyName || null,
        cargoOwnerProfile: {
          create: {
            companyName: payload.companyName || null,
            voen: payload.taxId || null,
          },
        },
      },
      include: { cargoOwnerProfile: true },
    });

    const token = await signAuthToken({
      sub: user.id,
      role: user.role as import("@/lib/jwt").AuthRole,
      email: user.email,
    });

    const response = ok({
      redirectTo: dashboardPathForRole(user.role),
      user: publicUser(user),
    });
    response.cookies.set(authCookieName, token, authCookieSetOptions());
    return response;
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return fail("Yük verən qeydiyyat məlumatlarını yoxlayın.", 400, parseZodError(error));
    }
    console.error("POST /api/auth/register-owner error:", error);
    return fail("Server xətası baş verdi.", 500);
  }
}
