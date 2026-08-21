"use client";

import { useEffect, useState } from "react";
import { ClipboardList, PhoneCall, ShieldCheck, UploadCloud, type LucideIcon } from "lucide-react";
import { PageSection, PublicPage } from "@/components/classifieds/shared";

const ICON_MAP: Record<string, LucideIcon> = {
  UploadCloud,
  ShieldCheck,
  ClipboardList,
  PhoneCall,
};

const DEFAULT_STEPS = [
  { icon: "UploadCloud", title: "Asan yük yerləşdirmə", text: "Yük sahibi qeydiyyatdan keçərək yük formunu bir neçə kliklə doldurur." },
  { icon: "ShieldCheck", title: "Təsdiqləmə vaxtı", text: "Dəqiqələr içində elanınız yoxlanılır, qaydalara uyğun olduqda təsdiqlənir." },
  { icon: "ClipboardList", title: "Əlçatan elan səhifəsi", text: "Elanınız əsas səhifədə görünərək sürücülər üçün daha əlçatan olur." },
  { icon: "PhoneCall", title: "Birbaşa zəng", text: "Fərdi sürücülər birbaşa sizinlə əlaqə saxlayaraq daşınmanın detallarını razılaşdırır." },
];

export function HowItWorksPageClient() {
  const [title, setTitle] = useState("Sadə elan modeli, sürətli əlaqə");
  const [description, setDescription] = useState("Tranzit.AZ marketplace deyil. Platforma yük elanını dərc edir və sürücünü birbaşa yük sahibi ilə danışdırır.");
  const [steps, setSteps] = useState(DEFAULT_STEPS);

  useEffect(() => {
    fetch("/api/public/page-content")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        if (d.howitworks_title) setTitle(d.howitworks_title);
        if (d.howitworks_description) setDescription(d.howitworks_description);
        if (d.howitworks_steps) {
          try { setSteps(JSON.parse(d.howitworks_steps)); } catch { /* keep default */ }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageSection title={title} description={description} />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {steps.map((step, i) => {
            const Icon = ICON_MAP[step.icon] ?? UploadCloud;
            return (
              <article key={i} className="surface-panel p-6">
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
