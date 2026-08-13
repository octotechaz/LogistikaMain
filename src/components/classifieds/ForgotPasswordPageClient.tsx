"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, MessageCircleMore } from "lucide-react";
import { PageSection, PublicPage } from "@/components/classifieds/shared";
import { PhoneField } from "@/components/PhoneField";
import { Button, ButtonLink } from "@/components/ui/Button";

type IdentityMode = "phone" | "email";
type Step = "request" | "reset" | "done";

export function ForgotPasswordPageClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [identityMode, setIdentityMode] = useState<IdentityMode>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [identityValue, setIdentityValue] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  function resolveIdentityInput() {
    if (identityMode === "email") {
      return email.trim();
    }
    return phone.trim();
  }

  async function onSendOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    try {
      let identity = resolveIdentityInput();

      if (identityMode === "phone") {
        const { canonicalizeLoginPhone } = await import("@/lib/login-identity");
        const canonical = canonicalizeLoginPhone(identity);
        if (!canonical) {
          setError("Telefon nömrəsini düzgün daxil edin.");
          setLoading(false);
          return;
        }
        identity = canonical;
      } else if (!identity) {
        setError("E-poçt daxil edin.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        setError(result?.message ?? "OTP göndərilmədi.");
        setLoading(false);
        return;
      }

      setIdentityValue(identity);
      setMaskedPhone(result.data?.maskedPhone ?? "");
      setInfo(result.data?.message ?? "WhatsApp OTP göndərildi.");
      setStep("reset");
    } catch {
      setError("OTP göndərilmədi. Zəhmət olmasa yenidən cəhd edin.");
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: identityValue,
          otp,
          password,
          confirmPassword,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        setError(result?.message ?? "Şifrə yenilənmədi.");
        setLoading(false);
        return;
      }

      setStep("done");
      setInfo(result.data?.message ?? "Şifrəniz yeniləndi.");
      window.setTimeout(() => {
        router.push("/login");
      }, 1800);
    } catch {
      setError("Şifrə yenilənmədi. Zəhmət olmasa yenidən cəhd edin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <PageSection
          title="Şifrəni yeniləyin"
          description="Hesabınızda qeydiyyatda olan telefon nömrəsinə WhatsApp OTP göndərilir. OTP düzgün olduqda yeni şifrə təyin edə bilərsiniz."
        />

        <div className="mt-6 surface-panel p-5 sm:p-6">
          {step === "request" ? (
            <form className="space-y-4" onSubmit={onSendOtp} aria-busy={loading}>
              <div>
                <span className="form-label">Hesab məlumatı</span>
                <div className="mt-1 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 text-sm font-medium text-slate-500">
                  <button
                    disabled={loading}
                    type="button"
                    onClick={() => {
                      setIdentityMode("phone");
                      setError("");
                    }}
                    className={
                      identityMode === "phone"
                        ? "rounded-md bg-white px-3 py-2 text-navy-900 shadow-sm disabled:opacity-60"
                        : "rounded-md px-3 py-2 disabled:opacity-60"
                    }
                  >
                    Telefon nömrəsi
                  </button>
                  <button
                    disabled={loading}
                    type="button"
                    onClick={() => {
                      setIdentityMode("email");
                      setError("");
                    }}
                    className={
                      identityMode === "email"
                        ? "rounded-md bg-white px-3 py-2 text-navy-900 shadow-sm disabled:opacity-60"
                        : "rounded-md px-3 py-2 disabled:opacity-60"
                    }
                  >
                    E-poçt
                  </button>
                </div>
              </div>

              {identityMode === "phone" ? (
                <PhoneField
                  label="Telefon nömrəsi"
                  name="phone"
                  value={phone}
                  onChange={setPhone}
                  disabled={loading}
                  defaultCountry="AZ"
                />
              ) : (
                <label className="form-label">
                  E-poçt
                  <input
                    disabled={loading}
                    name="email"
                    type="email"
                    className="form-field"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="email@example.com"
                    required
                  />
                </label>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                <div className="flex items-start gap-2">
                  <MessageCircleMore className="mt-0.5 h-4 w-4 shrink-0 text-logistics-orange" />
                  <p>
                    OTP admin WhatsApp xəttindən hesabınıza bağlı nömrəyə göndərilir.
                    E-poçt daxil etsəniz belə, kod qeydiyyatdakı telefonunuza gedir.
                  </p>
                </div>
              </div>

              {error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "OTP göndərilir..." : "WhatsApp OTP göndər"}
              </Button>
            </form>
          ) : null}

          {step === "reset" ? (
            <form className="space-y-4" onSubmit={onResetPassword} aria-busy={loading}>
              {info ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {info}
                  {maskedPhone ? ` (${maskedPhone})` : ""}
                </p>
              ) : null}

              <label className="form-label">
                OTP kodu
                <input
                  disabled={loading}
                  name="otp"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  className="form-field"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6 rəqəmli kod"
                  required
                />
              </label>

              <label className="form-label">
                Yeni şifrə
                <input
                  disabled={loading}
                  name="password"
                  type="password"
                  className="form-field"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 8 simvol"
                  minLength={8}
                  required
                />
              </label>

              <label className="form-label">
                Yeni şifrə (təkrar)
                <input
                  disabled={loading}
                  name="confirmPassword"
                  type="password"
                  className="form-field"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Şifrəni təkrar daxil edin"
                  minLength={8}
                  required
                />
              </label>

              {error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" className="flex-1" disabled={loading}>
                  <LockKeyhole className="mr-2 h-4 w-4" />
                  {loading ? "Yenilənir..." : "Şifrəni yenilə"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loading}
                  onClick={() => {
                    setStep("request");
                    setOtp("");
                    setPassword("");
                    setConfirmPassword("");
                    setError("");
                    setInfo("");
                  }}
                >
                  Geri
                </Button>
              </div>
            </form>
          ) : null}

          {step === "done" ? (
            <div className="space-y-4 text-center">
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                {info || "Şifrəniz yeniləndi."}
              </p>
              <p className="text-sm text-slate-500">Giriş səhifəsinə yönləndirilirsiniz...</p>
              <ButtonLink href="/login" className="w-full">
                İndi daxil ol
              </ButtonLink>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-4 text-sm">
            <Link href="/login" className="font-semibold text-logistics-orange transition hover:text-orange-600">
              Giriş səhifəsinə qayıt
            </Link>
            <Link href="/auth/register" className="font-semibold text-logistics-orange transition hover:text-orange-600">
              Yeni hesab yarat
            </Link>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
