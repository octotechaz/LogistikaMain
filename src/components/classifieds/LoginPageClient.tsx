"use client";

import Link from "next/link";
import { LockKeyhole, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageSection, PublicPage } from "@/components/classifieds/shared";
import { PhoneField } from "@/components/PhoneField";
import { Button } from "@/components/ui/Button";
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
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(resolveMode(searchParams.get("mode")));
  }, [searchParams]);

  useEffect(() => {
    if (authLoading || !authUser) return;
    if (authUser.role === "CARRIER") { router.replace("/carrier/dashboard"); return; }
    if (authUser.role === "CARGO_OWNER") { router.replace("/cargo-owner/dashboard"); return; }
    if (authUser.role === "ADMIN") { router.replace("/octo-admin"); }
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
        body: JSON.stringify({ email: identity, password, expectedRole: mode === "owner" ? "CARGO_OWNER" : "CARRIER" })
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setError(result?.message ?? t("login_error_invalid", "Giriş məlumatları yanlışdır."));
        setLoading(false);
        return;
      }

      const redirectTo = result.data?.redirectTo ?? "/carrier/dashboard";
      const role = result.data?.user?.role as string | undefined;
      const successMessage =
        role === "CARGO_OWNER"
          ? "Giriş uğurlu oldu. Elan panelinə yönləndirilir..."
          : role === "CARRIER"
            ? "Giriş uğurlu oldu. Kabinetə yönləndirilir..."
            : "Giriş uğurlu oldu. Yönləndirilir...";
      const { redirectAfterToast } = await import("@/lib/toast");
      redirectAfterToast(successMessage, redirectTo, 2500);
    } catch {
      setError(t("login_error_invalid", "Giriş məlumatları yanlışdır."));
      setLoading(false);
    }
  }

  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <PageSection
          title={mode === "owner" ? t("login_sidebar_owner_title", "Elanlarınızı idarə edin") : t("login_sidebar_carrier_title", "Uyğun yükləri tapın")}
          description={
            mode === "owner"
              ? t("login_sidebar_owner_desc", "Elanlarınızı yaradın, vəziyyətini izləyin və müraciətləri bir yerdən idarə edin.")
              : t("login_sidebar_carrier_desc", "Yükləri izləyin, seçilmiş elanları saxlayın və daşıma profilinizi yeniləyin.")
          }
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,1.05fr]">
          <div className="order-2 surface-panel p-6 lg:order-1">
            <h2 className="text-xl font-semibold text-navy-900">{t("login_sidebar_title", "Nə üçün giriş lazımdır?")}</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
              <p>{t("login_sidebar_owner_desc", "Yük sahibi elan yaradır, statusunu izləyir və lazım olduqda yenidən dərc edir.")}</p>
              <p>{t("login_sidebar_carrier_desc", "Yük daşıyan uyğun elanları izləyir, seçilmişlərə əlavə edir və öz daşıma profilini idarə edir.")}</p>
            </div>
          </div>

          <div className="order-1 surface-panel p-5 sm:p-6 lg:order-2">
            <div role="tablist" aria-label={t("login_eyebrow", "Giriş növü")}
              className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 text-sm font-medium text-slate-500">
              <button disabled={loading} type="button" role="tab" aria-selected={mode === "owner"}
                className={mode === "owner" ? "rounded-md bg-white px-4 py-2 text-navy-900 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-logistics-orange disabled:opacity-60" : "rounded-md px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-logistics-orange disabled:opacity-60"}
                onClick={() => { setMode("owner"); setError(""); }}>
                {t("login_tab_owner", "Yük sahibi")}
              </button>
              <button disabled={loading} type="button" role="tab" aria-selected={mode === "carrier"}
                className={mode === "carrier" ? "rounded-md bg-white px-4 py-2 text-navy-900 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-logistics-orange disabled:opacity-60" : "rounded-md px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-logistics-orange disabled:opacity-60"}
                onClick={() => { setMode("carrier"); setError(""); }}>
                {t("login_tab_carrier", "Yük daşıyan")}
              </button>
            </div>

            <form className="mt-5 space-y-3" onSubmit={onSubmit} aria-busy={loading}>
              <div>
                <span className="form-label">{t("login_eyebrow", "Giriş üsulu")}</span>
                <div role="tablist" aria-label={t("login_eyebrow", "Giriş üsulu")}
                  className="mt-1 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 text-sm font-medium text-slate-500">
                  <button disabled={loading} type="button" role="tab" aria-selected={identityMode === "phone"}
                    className={identityMode === "phone" ? "rounded-md bg-white px-3 py-2 text-navy-900 shadow-sm disabled:opacity-60" : "rounded-md px-3 py-2 disabled:opacity-60"}
                    onClick={() => { setIdentityMode("phone"); setError(""); }}>
                    {t("login_method_phone", "Telefon nömrəsi")}
                  </button>
                  <button disabled={loading} type="button" role="tab" aria-selected={identityMode === "email"}
                    className={identityMode === "email" ? "rounded-md bg-white px-3 py-2 text-navy-900 shadow-sm disabled:opacity-60" : "rounded-md px-3 py-2 disabled:opacity-60"}
                    onClick={() => { setIdentityMode("email"); setError(""); }}>
                    {t("login_method_email", "E-poçt")}
                  </button>
                </div>
              </div>

              {identityMode === "phone" ? (
                <PhoneField label={t("login_field_phone", "Telefon nömrəsi")} name="phone" value={phone} onChange={setPhone} disabled={loading} defaultCountry="AZ" />
              ) : (
                <label className="form-label">
                  {t("login_field_email", "E-poçt")}
                  <input disabled={loading} name="email" type="email" className="form-field" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("login_field_email_placeholder", "email@example.com")} required />
                </label>
              )}

              <label className="form-label">
                {t("login_field_password", "Şifrə")}
                <input name="password" type="password" className="form-field" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login_field_password_placeholder", "Şifrənizi daxil edin")}
                  required disabled={loading} />
              </label>

              <div className="-mt-1 flex items-center justify-end">
                <Link href="/auth/forgot-password" className="text-sm font-semibold text-logistics-orange transition hover:text-orange-600">
                  {t("login_forgot_password", "Şifrəni unutmusan?")}
                </Link>
              </div>

              {error ? <p role="alert" className="text-sm font-medium text-red-600">{error}</p> : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {mode === "carrier" ? <Truck className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                {loading ? t("login_btn_loading", "Yoxlanılır...") : mode === "carrier" ? t("login_btn_carrier", "Yükləri ara") : t("login_btn_owner", "Elanlarımı idarə et")}
              </Button>

              <div className="text-center text-sm text-slate-600">
                {t("login_no_account", "Hesabın yoxdur?")}{" "}
                <Link href={mode === "carrier" ? "/register/carrier" : "/cargo-owner/register"}
                  className="font-semibold text-logistics-orange transition hover:text-orange-600">
                  {mode === "carrier" ? t("login_register_carrier", "Daşıyıcı kimi qeydiyyatdan keç") : t("login_register_owner", "Elan sahibi kimi qeydiyyatdan keç")}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}