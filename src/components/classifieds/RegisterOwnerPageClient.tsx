"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Boxes,
  Truck,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Percent,
  Headphones,
  HelpCircle,
  Info
} from "lucide-react";
import { PublicPage } from "@/components/classifieds/shared";
import { useLocale } from "@/hooks/useLocale";

export function RegisterOwnerPageClient() {
  const { t } = useLocale();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [phone, setPhone] = useState("+994 ");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const { canonicalizeLoginPhone } = await import("@/lib/login-identity");
      const canonicalPhone = canonicalizeLoginPhone(phone);
      if (!canonicalPhone) {
        setError(t("login_error_phone", "Telefon nömrəsini düzgün daxil edin."));
        setLoading(false);
        return;
      }

      if (password.length < 8) {
        setError("Şifrə ən azı 8 simvol olmalıdır.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/auth/register-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: canonicalPhone,
          password,
          companyName: companyName.trim(),
          taxId: taxId.trim()
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.ok === false) {
        setError(data?.message || t("register_error", "Qeydiyyat zamanı xəta baş verdi."));
        setLoading(false);
        return;
      }

      const redirectTo = data?.data?.redirectTo || "/cargo-owner/dashboard";
      const { redirectAfterToast } = await import("@/lib/toast");
      redirectAfterToast(
        t("register_success", "Qeydiyyat uğurla tamamlandı. Panelə yönləndirilir..."),
        redirectTo,
        2000
      );
    } catch (err) {
      console.error(err);
      setError(t("register_error", "Serverə qoşulmaq mümkün olmadı."));
      setLoading(false);
    }
  }

  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto w-full max-w-[1280px] min-w-0 px-4 sm:px-[32px] pt-[16px] pb-16">
        {/* Top Header Badge */}
        <div className="mb-2">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
            <span className="w-2 h-2 rounded-full bg-[#FEDE47]"></span>
            QEYDİYYAT MƏRHƏLƏSİ
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-[36px] font-extrabold tracking-tight text-[#1B0A33]">
            Yük sahibi hesabı yaradın
          </h1>
          <p className="mt-2 text-sm sm:text-base font-medium text-slate-500 max-w-2xl leading-relaxed">
            Qeydiyyatdan sonra dərhal dashboard-a keçib ilk elanınızı yerləşdirə bilərsiniz.
          </p>
        </div>

        {/* Main Grid: Form (Left) + Sidebar (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form Card */}
          <div className="lg:col-span-8 bg-white rounded-[24px] p-6 sm:p-10 border border-slate-100 shadow-sm">
            {/* Top User Type Selector Tabs */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 gap-1 mb-8">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-[#FEDE47] text-slate-900 shadow-sm transition-all"
              >
                <Boxes className="w-4 h-4" />
                Yük sahibi
              </button>

              <Link
                href="/register/carrier"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 transition-all"
              >
                <Truck className="w-4 h-4" />
                Daşıyıcı / Sürücü
              </Link>
            </div>

            {/* Registration Form */}
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Row 1: Ad & Soyad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ad *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Məs. Elvin"
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Soyad *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Məs. Məmmədov"
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Row 2: Şirkət adı & VÖEN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Şirkət adı
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Məs. Silk Way Logistika MMC"
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    VÖEN
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="10 rəqəmli VÖEN"
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Row 3: Telefon nömrəsi & Şifrə */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Telefon nömrəsi *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+994 50 123 45 67"
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Şifrə *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
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
              </div>

              {/* Info hint */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Təhlükəsizlik üçün böyük və kiçik hərflər, rəqəmlər və simvollardan istifadə etməyiniz tövsiyə olunur.</span>
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
                  <span>{loading ? "Yaradılır..." : "Hesab yarat"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Terms agreement note */}
              <p className="text-center text-xs text-slate-500 pt-1">
                Hesab yarat düyməsini sıxmaqla siz{" "}
                <Link href="/istifade-sertleri" className="font-bold underline text-slate-800">
                  İstifadə şərtləri
                </Link>{" "}
                və{" "}
                <Link href="/mexfilik-siyaseti" className="font-bold underline text-slate-800">
                  Məxfilik siyasəti
                </Link>{" "}
                ilə razılaşırsınız.
              </p>

              {/* Login link */}
              <div className="pt-4 border-t border-slate-100 text-center text-sm text-slate-600">
                Artıq qeydiyyatdan keçmisiniz?{" "}
                <Link href="/login" className="font-bold text-slate-900 hover:underline">
                  Daxil olun
                </Link>
              </div>
            </form>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Top Dark Stats Card */}
            <div className="bg-[#20073e] rounded-[24px] p-6 text-white shadow-lg shadow-purple-950/15 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider">
                  OPERATİV LOGİSTİKA
                </span>
                <Truck className="w-5 h-5 text-yellow-400" />
              </div>

              <div className="mt-4">
                <p className="text-xs text-purple-200">Orta tapılma müddəti</p>
                <p className="text-3xl font-black text-white mt-1">14 dəqiqə</p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-purple-200">Gündəlik aktiv reyslər</span>
                <span className="font-bold text-white">+840 reys</span>
              </div>

              {/* Stylized wavy line graph */}
              <div className="mt-2 h-8 w-full">
                <svg className="w-full h-full" viewBox="0 0 200 40" fill="none">
                  <path
                    d="M0 30 Q 30 35, 60 25 T 120 18 T 160 12 T 200 20"
                    stroke="#FEDE47"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </div>
            </div>

            {/* Why Tranzit.AZ Card */}
            <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm space-y-5">
              <h3 className="text-base font-bold text-[#1B0A33]">Niyə Tranzit.AZ?</h3>

              {/* Item 1 */}
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-slate-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Doğrulanmış Daşıyıcılar</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Bütün yükdaşıyan şirkətlər və sürücülər VÖEN və sənəd yoxlanışından keçir.
                  </p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-slate-700">
                  <Percent className="w-4 h-4 text-slate-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">0% Komissiya</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Yük sahibləri üçün elan yerləşdirmək və təklifləri qəbul etmək tamamilə ödənişsizdir.
                  </p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-slate-700">
                  <Headphones className="w-4 h-4 text-slate-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">24/7 Dəstək Xidməti</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Yükünüz çatana qədər operativ dispetçer və dəstək komandamız yanınızdadır.
                  </p>
                </div>
              </div>

              {/* Support footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  Kömək lazımdır?
                </span>
                <a
                  href="tel:+994501234567"
                  className="font-bold text-slate-900 hover:text-yellow-600 transition-colors"
                >
                  +994 50 123 45 67
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
