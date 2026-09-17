"use client";

import { Mail, PhoneCall, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { StaticContentCard, StaticPageShell } from "@/components/classifieds/StaticPageShell";

const successMessage = "Mesajınız qeydə alındı. Tezliklə sizinlə əlaqə saxlanılacaq.";

export function ContactPageClient() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <StaticPageShell
      title="Əlaqə"
      description="Suallarınız, təklifləriniz və əməkdaşlıq müraciətləriniz üçün bizimlə əlaqə saxlaya bilərsiniz."
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        <StaticContentCard className="space-y-6">
          <div>
            <h2 className="text-[1.45rem] font-bold text-navy-900">Əlaqə məlumatları</h2>
            <p className="mt-3 text-[0.98rem] leading-7 text-slate-600">
              Platformadan istifadə ilə bağlı suallar, tərəfdaşlıq təklifləri və ümumi müraciətlər üçün aşağıdakı məlumatlardan istifadə edin.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-[18px] border border-slate-200 bg-slate-50/70 p-4">
              <PhoneCall className="mt-0.5 h-5 w-5 shrink-0 text-logistics-orange" />
              <div>
                <p className="text-sm font-semibold text-navy-900">Telefon</p>
                <p className="mt-1 text-[0.98rem] text-slate-600">+994 50 123 45 67</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-[18px] border border-slate-200 bg-slate-50/70 p-4">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-logistics-orange" />
              <div>
                <p className="text-sm font-semibold text-navy-900">E-mail</p>
                <p className="mt-1 text-[0.98rem] text-slate-600">info@tranzit.az</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-[18px] border border-slate-200 bg-slate-50/70 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-logistics-orange" />
              <div>
                <p className="text-sm font-semibold text-navy-900">İş saatları</p>
                <p className="mt-1 text-[0.98rem] text-slate-600">Hər gün 09:00 - 18:00</p>
              </div>
            </div>
          </div>
        </StaticContentCard>

        <StaticContentCard>
          <div className="mb-6">
            <h2 className="text-[1.45rem] font-bold text-navy-900">Bizə yazın</h2>
            <p className="mt-3 text-[0.98rem] leading-7 text-slate-600">
              Formu doldurun, müraciətiniz qeydə alınsın. Komandamız ən qısa zamanda sizinlə əlaqə saxlayacaq.
            </p>
          </div>

          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitted(true);
              event.currentTarget.reset();
            }}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="form-label">
                <span>Ad</span>
                <input name="name" className="form-field" placeholder="Adınızı daxil edin" required />
              </label>

              <label className="form-label">
                <span>E-mail və ya telefon</span>
                <input name="contact" className="form-field" placeholder="info@example.com və ya +994..." required />
              </label>
            </div>

            <label className="form-label">
              <span>Mövzu</span>
              <input name="subject" className="form-field" placeholder="Mövzunu yazın" required />
            </label>

            <label className="form-label">
              <span>Mesaj</span>
              <textarea
                name="message"
                className="form-field min-h-32"
                placeholder="Mesajınızı ətraflı yazın"
                required
              />
            </label>

            {submitted ? (
              <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <Button className="min-h-12 rounded-[14px] px-5">
              <Send className="h-4.5 w-4.5" />
              Göndər
            </Button>
          </form>
        </StaticContentCard>
      </div>
    </StaticPageShell>
  );
}
