import "server-only";

import { randomInt } from "node:crypto";

type OtpPurpose = "registration" | "password_reset";

function backendUrl() {
  return process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:4001";
}

export function generateOtpCode() {
  return String(randomInt(100000, 1000000));
}

export async function sendWhatsAppOtp(
  phone: string,
  code: string,
  purpose: OtpPurpose = "registration"
) {
  const response = await fetch(`${backendUrl()}/api/whatsapp/send-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code, purpose }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; error?: string; message?: string }
    | null;

  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error || payload?.message || "WhatsApp OTP göndərilmədi. Zəhmət olmasa bir az sonra yenidən cəhd edin."
    );
  }
}

export async function verifyWhatsAppOtp(phone: string, otp: string) {
  const response = await fetch(`${backendUrl()}/api/whatsapp/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; message?: string }
    | null;

  if (!response.ok || !payload?.success) {
    return {
      ok: false as const,
      message: payload?.message || "OTP kodu yanlışdır və ya vaxtı bitib.",
    };
  }

  return { ok: true as const };
}
