import { fail, ok, parseZodError } from "@/lib/api";
import { findUserByIdentity } from "@/lib/find-user-by-identity";
import { canonicalizeLoginPhone, isEmailIdentity } from "@/lib/login-identity";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { verifyWhatsAppOtp } from "@/lib/whatsapp-otp";
import { forgotPasswordResetSchema } from "@/lib/validations/auth";

const GENERIC_NOT_FOUND =
  "Bu məlumatlarla hesab tapılmadı və ya hesabda telefon nömrəsi yoxdur.";

function resolveIdentity(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false as const, message: "Email və ya telefon daxil edin." };
  }

  if (isEmailIdentity(trimmed)) {
    return { ok: true as const, identity: trimmed.toLowerCase() };
  }

  const canonical = canonicalizeLoginPhone(trimmed);
  if (!canonical) {
    return { ok: false as const, message: "Telefon nömrəsini düzgün daxil edin." };
  }

  return { ok: true as const, identity: canonical };
}

export async function POST(request: Request) {
  try {
    const payload = forgotPasswordResetSchema.parse(await request.json());
    const resolved = resolveIdentity(payload.identity);
    if (!resolved.ok) {
      return fail(resolved.message, 400);
    }

    const user = await findUserByIdentity(resolved.identity);
    if (!user || user.status === "BLOCKED") {
      return fail(GENERIC_NOT_FOUND, 404);
    }

    const accountPhone = user.phone?.trim();
    if (!accountPhone) {
      return fail("Hesabınızda təsdiqlənmiş telefon nömrəsi tapılmadı.", 400);
    }

    const verification = await verifyWhatsAppOtp(accountPhone, payload.otp);
    if (!verification.ok) {
      return fail(verification.message, 400);
    }

    const passwordHash = await hashPassword(payload.password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return ok({
      message: "Şifrəniz uğurla yeniləndi. İndi yeni şifrə ilə daxil ola bilərsiniz.",
    });
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return fail("Məlumatları yoxlayın.", 400, parseZodError(error));
    }

    console.error("[auth/forgot-password/reset]", error);
    return fail("Şifrə yenilənmədi. Zəhmət olmasa yenidən cəhd edin.", 500);
  }
}
