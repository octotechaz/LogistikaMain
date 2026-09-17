import { fail, ok, parseZodError } from "@/lib/api";
import { findUserByIdentity, maskPhoneNumber } from "@/lib/find-user-by-identity";
import { canonicalizeLoginPhone, isEmailIdentity } from "@/lib/login-identity";
import { generateOtpCode, sendWhatsAppOtp } from "@/lib/whatsapp-otp";
import { forgotPasswordSendOtpSchema } from "@/lib/validations/auth";

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
    const payload = forgotPasswordSendOtpSchema.parse(await request.json());
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

    const otp = generateOtpCode();
    await sendWhatsAppOtp(accountPhone, otp, "password_reset");

    return ok({
      maskedPhone: maskPhoneNumber(accountPhone),
      message: `${maskPhoneNumber(accountPhone)} nömrəsinə WhatsApp OTP göndərildi.`,
    });
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return fail("Məlumatları yoxlayın.", 400, parseZodError(error));
    }

    console.error("[auth/forgot-password/send-otp]", error);
    return fail(
      error instanceof Error
        ? error.message
        : "OTP göndərilmədi. WhatsApp bağlantısını yoxlayın.",
      500
    );
  }
}
