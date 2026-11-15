"use client";

import Link from "next/link";
import {
  Lock,
  Truck,
  Boxes,
  Phone,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Clock,
  Bell,
  ArrowRight
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PublicPage } from "@/components/classifieds/shared";
import { useApiAuthUser } from "@/hooks/useApiAuthUser";
import { useLocale } from "@/hooks/useLocale";

type LoginMode = "owner" | "carrier";
type IdentityMode = "phone" | "email";

function resolveMode(rawMode: string | null): LoginMode {
  return rawMode === "carrier" ? "carrier" : "owner";
}

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser, isLoading: authLoading } = useApiAuthUser();
  const { t } = useLocale();

  const [mode, setMode] = useState<LoginMode>(resolveMode(searchParams.get("mode")));
  const [identityMode, setIdentityMode] = useState<IdentityMode>("phone");
  const [phone, setPhone] = useState("+994 ");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(resolveMode(searchParams.get("mode")));
  }, [searchParams]);

  useEffect(() => {
    if (authLoading || !authUser) return;
    if (authUser.role === "CARRIER") {
      router.replace("/carrier/dashboard");
      return;
    }
    if (authUser.role === "CARGO_OWNER") {
      router.replace("/cargo-owner/dashboard");
      return;
    }
    if (authUser.role === "ADMIN") {
      router.replace("/octo-admin");
    }
  }, [authLoading, authUser, router]);

  function resolveIdentity() {
    return identityMode === "email" ? email.trim() : phone.trim();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      let identity = resolveIdentity();

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

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: identity,
          password,
          expectedRole: mode === "owner" ? "CARGO_OWNER" : "CARRIER"
        })
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setError(result?.message ?? t("login_error_invalid", "Giriş məlumatları yanlışdır."));
        setLoading(false);
        return;
      }

      const redirectTo = result.data?.redirectTo ?? (mode === "owner" ? "/cargo-owner/dashboard" : "/carrier/dashboard");
      const role = result.data?.user?.role as string | undefined;
      const successMessage =
        role === "CARGO_OWNER"
          ? "Giriş uğurlu oldu. Elan panelinə yönləndirilir..."
          : role === "CARRIER"
            ? "Giriş uğurlu oldu. Kabinetə yönləndirilir..."
            : "Giriş uğurlu oldu. Yönləndirilir...";

      const { redirectAfterToast } = await import("@/lib/toast");
      redirectAfterToast(successMessage, redirectTo, 2000);
    } catch {
      setError(t("login_error_invalid", "Giriş məlumatları yanlışdır."));
      setLoading(false);
    }
  }

  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto w-full max-w-[1280px] min-w-0 px-4 sm:px-[32px] pt-[16px] pb-16">
        {/* Top Header Badge */}
        <div className="mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEDE47] text-slate-900 text-xs font-bold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            TƏHLÜKƏSİZ GİRİŞ
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-[36px] font-extrabold tracking-tight text-[#1B0A33]">
            Elanlarınızı idarə edin
          </h1>
          <p className="mt-2 text-sm sm:text-base font-medium text-slate-500 max-w-2xl leading-relaxed">
            Elanlarınızı yaradın, vəziyyətini izləyin və müraciətləri bir yerdən idarə edin.
          </p>
        </div>

        {/* Main Grid: Left Dark Card + Right Form Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Dark Purple Card */}
          <div className="lg:col-span-5 bg-[#20073e] rounded-[24px] p-8 sm:p-10 text-white flex flex-col justify-between shadow-lg shadow-purple-950/15">
            <div>
              {/* Yellow Truck Icon */}
              <div className="w-12 h-12 rounded-xl bg-yellow-400/20 text-[#FEDE47] flex items-center justify-center mb-6">
                <Truck className="w-6 h-6 text-[#FEDE47]" />
              </div>

              <h2 className="text-2xl sm:text-[26px] font-bold text-white mb-4 leading-snug">
                Nə üçün giriş lazımdır?
              </h2>

              <p className="text-sm sm:text-[15px] text-purple-200/90 leading-relaxed font-normal">
                Yük sahibi elan yaradır, statusunu izləyir və lazım olduqda yenidən dərc edir. Yük daşıyan uyğun elanları izləyir, seçilmişlərə əlavə edir və öz daşıma profilini idarə edir.
              </p>
            </div>

            {/* Bottom Verified Badge inside card */}
            <div className="mt-8 rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#FEDE47] shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#FEDE47]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Təsdiqlənmiş profil</p>
                <p className="text-xs text-purple-300 mt-0.5">Tranzit.AZ etibarlı logistika şəbəkəsi</p>
              </div>
            </div>
          </div>

          {/* Right White Form Card */}
          <div className="lg:col-span-7 bg-white rounded-[24px] p-6 sm:p-10 border border-slate-100 shadow-sm flex flex-col justify-center">
            {/* Top User Type Tabs (Yük sahibi / Yük daşıyan) */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 gap-1 mb-6 self-start">
              <button
                type="button"
                onClick={() => {
                  setMode("owner");
                  setError("");
                }}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                  mode === "owner"
                    ? "bg-[#FEDE47] text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 font-semibold"
                }`}
              >
                <Boxes className="w-4 h-4" />
                Yük sahibi
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("carrier");
                  setError("");
                }}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                  mode === "carrier"
                    ? "bg-[#FEDE47] text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 font-semibold"
                }`}
              >
                <Truck className="w-4 h-4" />
                Yük daşıyan
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Giriş üsulu */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Giriş üsulu</p>
                <div className="inline-flex p-1 rounded-xl bg-slate-100 gap-1">
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
              </div>

              {/* Identifier Input */}
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
                      placeholder="+994 50 123 45 67"
                      className="w-full h-12 px-4 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors"
                      required
                      disabled={loading}
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    E-poçt
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

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Şifrə
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Şifrənizi daxil edin"
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

              {/* Forgot Password Link */}
              <div className="pt-0.5">
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Şifrəni unutmusan?
                </Link>
              </div>

              {/* Error Message */}
              {error ? (
                <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs font-semibold text-red-600">
                  {error}
                </div>
              ) : null}

              {/* Submit CTA Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-[#FEDE47] hover:bg-yellow-400 text-slate-900 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-60"
                >
                  <span>
                    {loading
                      ? "Yoxlanılır..."
                      : mode === "owner"
                        ? "Elanlarımı idarə et"
                        : "Yükləri idarə et"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Register Link */}
              <div className="pt-3 text-center text-xs text-slate-600">
                Hesabın yoxdur?{" "}
                <Link
                  href={mode === "carrier" ? "/register/carrier" : "/cargo-owner/register"}
                  className="font-bold text-slate-900 hover:underline"
                >
                  {mode === "carrier"
                    ? "Daşıyıcı kimi qeydiyyatdan keç"
                    : "Elan sahibi kimi qeydiyyatdan keç"}
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Bottom 3 Feature Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#20073e] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-[#20073e]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1B0A33]">Sürətli elan yerləşdirmə</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Yük və nəqliyyat parametrini 2 dəqiqə ərzində tamamlayın.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#20073e] flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-[#20073e]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1B0A33]">Dərhal bildirişlər</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Uyğun təkliflər və elan vəziyyətləri anlıq çatdırılır.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#20073e] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#20073e]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1B0A33]">Təhlükəsiz daşıma</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Yalnız yoxlanılmış sürücülər və birbaşa təhlükəsiz əlaqə.
              </p>
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
