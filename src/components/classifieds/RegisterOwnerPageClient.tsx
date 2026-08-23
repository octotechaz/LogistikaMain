"use client";

import { useState } from "react";
import { PageSection, PublicPage } from "@/components/classifieds/shared";
import { PhoneField } from "@/components/PhoneField";
import { Button } from "@/components/ui/Button";
import { FastLink as Link } from "@/components/ui/FastLink";
import { PASSWORD_POLICY } from "@/lib/password-policy";
import { useLocale } from "@/hooks/useLocale";

export function RegisterOwnerPageClient() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useLocale();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    const formData = new FormData(event.currentTarget);

    try {
      const { normalizeInternationalPhone } = await import("@/lib/phone-validation");
      const canonicalPhone = normalizeInternationalPhone(phone);
      if (!canonicalPhone) {
        window.alert(t("login_error_phone", "Telefon nömrəsini düzgün daxil edin."));
        setLoading(false);
        return;
      }

      const response = await fetch("/api/auth/register-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: String(formData.get("firstName") || ""),
          lastName: String(formData.get("lastName") || ""),
          phone: canonicalPhone,
          password: String(formData.get("password") || ""),
          companyName: String(formData.get("companyName") || ""),
          taxId: String(formData.get("taxId") || "")
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.ok === false) {
        window.alert(data?.message || t("register_error", "Qeydiyyat zamanı xəta baş verdi."));
        setLoading(false);
        return;
      }

      const redirectTo = data?.data?.redirectTo || "/cargo-owner/dashboard";
      const { redirectAfterToast } = await import("@/lib/toast");
      redirectAfterToast(t("register_success", "Qeydiyyat uğurla tamamlandı. Panelə yönləndirilir..."), redirectTo, 2500);
    } catch (error) {
      console.error(error);
      window.alert(t("register_error", "Serverə qoşulmaq mümkün olmadı."));
      setLoading(false);
    }
  }

  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <PageSection
          title={t("register_eyebrow_owner", "Yük sahibi hesabı yaradın")}
          description={t("register_subtitle_owner", "Qeydiyyatdan sonra dərhal dashboard-a keçib ilk elanınızı yerləşdirə bilərsiniz.")}
        />
        <form className="mt-6 surface-panel p-6" onSubmit={onSubmit} aria-busy={loading}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="form-label">
              {t("register_field_firstname", "Ad")}
              <input disabled={loading} name="firstName" className="form-field" required />
            </label>
            <label className="form-label">
              {t("register_field_lastname", "Soyad")}
              <input disabled={loading} name="lastName" className="form-field" required />
            </label>
            <label className="form-label">
              {t("register_field_company", "Şirkət adı")}
              <input disabled={loading} name="companyName" className="form-field" />
            </label>
            <label className="form-label">
              {t("register_field_voen", "VÖEN")}
              <input disabled={loading} name="taxId" className="form-field" />
            </label>
            <PhoneField
              label={t("register_field_phone", "Telefon")}
              name="phone"
              value={phone}
              onChange={setPhone}
              disabled={loading}
            />
            <label className="form-label">
              {t("register_field_password", "Şifrə")}
              <input
                disabled={loading}
                name="password"
                type="password"
                className="form-field"
                required
                minLength={PASSWORD_POLICY.minimumLength}
                placeholder={`${t("forgot_new_password_placeholder", "Minimum")} ${PASSWORD_POLICY.minimumLength} simvol`}
              />
              <span className="text-xs leading-5 text-slate-500">{PASSWORD_POLICY.recommendation}</span>
            </label>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" disabled={loading}>
              {loading ? t("register_btn_loading", "Göndərilir...") : t("register_btn", "Hesab yarat")}
            </Button>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              {t("register_terms_prefix", "Hesab yarat düyməsini sıxmaqla siz")}{" "}
              <Link href="/istifade-sertleri" className="font-semibold text-navy-900 underline decoration-slate-300 underline-offset-4 transition hover:text-logistics-orange">
                {t("register_terms_link", "İstifadə şərtləri")}
              </Link>{" "}
              {t("register_terms_suffix", "ilə razılaşdığınızı təsdiqləyirsiniz.")}
            </p>
          </div>
        </form>
      </section>
    </PublicPage>
  );
}