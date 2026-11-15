"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Smartphone,
  Mail,
  MessageSquare,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2
} from "lucide-react";
import { PublicPage } from "@/components/classifieds/shared";
import { useLocale } from "@/hooks/useLocale";

type IdentityMode = "phone" | "email";
type Step = "request" | "reset" | "done";

export function ForgotPasswordPageClient() {
  const router = useRouter();
  const { t } = useLocale();

  const [step, setStep] = useState<Step>("request");
  const [identityMode, setIdentityMode] = useState<IdentityMode>("phone");
  const [phone, setPhone] = useState("+994 ");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [identityValue, setIdentityValue] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  function resolveIdentityInput() {
    return identityMode === "email" ? email.trim() : phone.trim();
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
          setError(t("login_error_phone", "Telefon nömrəsini düzgün daxil edin."));
          setLoading(false);
          return;
        }
        identity = canonical;
      } else if (!identity) {
        setError(t("login_error_email", "E-poçt daxil edin."));
        setLoading(false);
        return;
      }

      const response = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity })
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        setError(
          result?.message ??
            t("forgot_error_send", "OTP göndərilmədi. Zəhmət olmasa yenidən cəhd edin.")
        );
        setLoading(false);
        return;
      }

      setIdentityValue(identity);
      setInfo(result.data?.message ?? "WhatsApp OTP göndərildi.");
      setStep("reset");
    } catch {
      setError(t("forgot_error_send", "OTP göndərilmədi. Zəhmət olmasa yenidən cəhd edin."));
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
        body: JSON.stringify({ identity: identityValue, otp, password, confirmPassword })
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        setError(
          result?.message ??
            t("forgot_error_reset", "Şifrə yenilənmədi. Zəhmət olmasa yenidən cəhd edin.")
        );
        setLoading(false);
        return;
      }

      setStep("done");
      const { redirectAfterToast } = await import("@/lib/toast");
      redirectAfterToast("Şifrəniz uğurla yeniləndi! Girişə yönləndirilir...", "/login", 2000);
    } catch {
      setError(t("forgot_error_reset", "Şifrə yenilənmədi. Zəhmət olmasa yenidən cəhd edin."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto w-full max-w-[560px] min-w-0 px-4 pt-10 sm:pt-14 pb-20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-[36px] font-extrabold text-[#1B0A33] tracking-tight">
            Şifrəni yeniləyin
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-500 max-w-md mx-auto leading-relaxed">
            Hesabınızda qeydiyyatda olan telefon nömrəsinə WhatsApp OTP göndərilir.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-100 shadow-sm">
          {step === "request" ? (
            <div>
              {/* Tabs */}
              <div className="inline-flex p-1 rounded-xl bg-slate-100 gap-1 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setIdentityMode("phone");
                    setError("");
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    identityMode === "phone"
                      ? "bg-[#FEDE47] text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 font-semibold"
                  }`}
                >
                  Telefon nömrəsi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIdentityMode("email");
                    setError("");
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    identityMode === "email"
                      ? "bg-[#FEDE47] text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 font-semibold"
                  }`}
                >
                  E-poçt
                </button>
              </div>

              {/* Form */}
              <form onSubmit={onSendOtp} className="space-y-4">
                {identityMode === "phone" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Telefon nömrəsi
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+994 "
                        className="w-full h-12 px-4 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors"
                        required
                        disabled={loading}
                      />
                      <Smartphone className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Hesabınızda qeydiyyatda olan nömrəyə WhatsApp OTP göndərilir.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      E-poçt ünvanı
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nümunə@tranzit.az"
                        className="w-full h-12 px-4 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors"
                        required
                        disabled={loading}
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                )}

                {error ? (
                  <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs font-semibold text-red-600">
                    {error}
                  </div>
                ) : null}

                {/* CTA Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-[#FEDE47] hover:bg-yellow-400 text-slate-900 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-60"
                  >
                    <MessageSquare className="w-4 h-4 fill-slate-900 text-slate-900" />
                    <span>{loading ? "Göndərilir..." : "WhatsApp OTP göndər"}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : step === "reset" ? (
            <div>
              {info ? (
                <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs font-medium text-emerald-800">
                  {info}
                </div>
              ) : null}

              <form onSubmit={onResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    WhatsApp OTP Kodu
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6 rəqəmli OTP kodu"
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors tracking-widest text-center"
                    maxLength={6}
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Yeni şifrə
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 simvol"
                      className="w-full h-12 px-4 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Şifrə təkrarı
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Şifrəni təkrar daxil edin"
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors"
                    required
                    disabled={loading}
                  />
                </div>

                {error ? (
                  <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs font-semibold text-red-600">
                    {error}
                  </div>
                ) : null}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-[#FEDE47] hover:bg-yellow-400 text-slate-900 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-60"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{loading ? "Yenilənir..." : "Şifrəni yenilə"}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900">Şifrəniz yeniləndi!</h3>
              <p className="text-xs text-slate-500 mt-1 mb-6">
                Yeni şifrənizlə sistemə daxil ola bilərsiniz.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-[#FEDE47] hover:bg-yellow-400 text-slate-900 font-bold text-sm transition-colors shadow-sm"
              >
                Girişə keç
              </Link>
            </div>
          )}

          {/* Bottom Links */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 text-xs">
            <Link
              href="/login"
              className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Giriş səhifəsinə qayıt
            </Link>

            <Link
              href="/cargo-owner/register"
              className="font-bold text-slate-900 hover:underline transition-colors"
            >
              Yeni hesab yarat
            </Link>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
