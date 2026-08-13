"use client";

import { ClipboardList, PhoneCall, ShieldCheck, UploadCloud } from "lucide-react";
import { PageSection, PublicPage } from "@/components/classifieds/shared";

const steps = [
  {
    icon: UploadCloud,
    title: "Asan yük yerləşdirmə",
    text: "Yük sahibi qeydiyyatdan keçərək yük formunu bir neçə kliklə doldurur."
  },
  {
    icon: ShieldCheck,
    title: "Təsdiqləmə vaxtı",
    text: "Dəqiqələr içində elanınız yoxlanılır, qaydalara uyğun olduqda təsdiqlənir."
  },
  {
    icon: ClipboardList,
    title: "Əlçatan elan səhifəsi",
    text: "Elanınız əsas səhifədə görünərək sürücülər üçün daha əlçatan olur."
  },
  {
    icon: PhoneCall,
    title: "Birbaşa zəng",
    text: "Fərdi sürücülər birbaşa sizinlə əlaqə saxlayaraq daşınmanın detallarını razılaşdırır."
  }
];

export function HowItWorksPageClient() {
  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageSection
          title="Sadə elan modeli, sürətli əlaqə"
          description="Tranzit.AZ marketplace deyil. Platforma yük elanını dərc edir və sürücünü birbaşa yük sahibi ilə danışdırır."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="surface-panel p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-logistics-orange">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-navy-900">{step.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{step.text}</p>
              </article>
            );
          })}
        </div>
      </section>
    </PublicPage>
  );
}
