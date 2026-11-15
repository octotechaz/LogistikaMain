"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Truck } from "lucide-react";
import { PublicPage } from "@/components/classifieds/shared";
import { useLocale } from "@/hooks/useLocale";

const STEPS = [
  {
    stepNumber: "1",
    stepLabel: "Addım 01",
    title: "Asan yük yerləşdirmə",
    text: "Yük sahibi qeydiyyatdan keçərək yük formunu bir neçə kliklə doldurur."
  },
  {
    stepNumber: "2",
    stepLabel: "Addım 02",
    title: "Təsdiqləmə vaxtı",
    text: "Dəqiqələr içində elanınız yoxlanılır, qaydalara uyğun olduqda təsdiqlənir."
  },
  {
    stepNumber: "3",
    stepLabel: "Addım 03",
    title: "Əlçatan elan səhifəsi",
    text: "Elanınız əsas səhifədə görünərək sürücülər üçün daha əlçatan olur."
  },
  {
    stepNumber: "4",
    stepLabel: "Nəticə",
    isFinal: true,
    title: "Birbaşa zəng",
    text: "Fərdi sürücülər birbaşa sizinlə əlaqə saxlayaraq daşınmanın detallarını razılaşdırır."
  }
];

export function HowItWorksPageClient() {
  const { t } = useLocale();

  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto w-full max-w-[1280px] min-w-0 px-4 sm:px-[32px] pt-[16px] pb-12 flex flex-col gap-8 sm:gap-10">
        {/* Header Section */}
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF5B2] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#8F6B00]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8F6B00]" />
            <span>{t("howitworks_badge", "NECƏ İŞLƏYİR")}</span>
          </div>

          <h1 className="mt-3 text-3xl sm:text-[36px] font-extrabold tracking-tight text-[#1B0A33]">
            {t("howitworks_title", "Sadə elan modeli, sürətli əlaqə")}
          </h1>
          <p className="mt-2.5 text-sm sm:text-base font-medium text-slate-500 max-w-3xl leading-relaxed">
            {t(
              "howitworks_description",
              "Tranzit.AZ marketplace deyil. Platforma yük elanını dərc edir və sürücünü birbaşa yük sahibi ilə danışdırır."
            )}
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="flex flex-col justify-between min-h-[290px] sm:min-h-[310px] rounded-[24px] bg-white p-7 sm:p-8 border border-slate-100 shadow-sm transition hover:shadow-md"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#FFF5B2] text-base font-extrabold text-neutral-900">
                  {step.stepNumber}
                </div>
                <h3 className="mt-5 text-xl font-bold text-neutral-900 leading-snug">
                  {t(`howitworks_step_${i}_title`, step.title)}
                </h3>
                <p className="mt-3 text-sm font-medium text-slate-500 leading-relaxed">
                  {t(`howitworks_step_${i}_text`, step.text)}
                </p>
              </div>

              <div className="mt-8 flex items-center gap-1.5 text-xs font-bold text-[#8F6B00]">
                <span>{step.stepLabel}</span>
                {step.isFinal ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action Banner */}
        <div className="rounded-[24px] bg-white p-6 sm:p-7 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-[#FEDE47] text-neutral-900">
              <Truck className="h-7 w-7" strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 leading-snug">
                {t("howitworks_cta_title", "Yükünüz var və dərhal göndərməlisiniz?")}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {t("howitworks_cta_desc", "Komissiyasız və vasitəçisiz daşınmanı təmin edin.")}
              </p>
            </div>
          </div>

          <Link
            href="/cargo-owner/cargo-posts/new"
            className="inline-flex items-center justify-center rounded-[14px] bg-[#FEDE47] hover:bg-[#fdd835] px-7 py-3.5 text-sm font-bold text-neutral-900 transition whitespace-nowrap self-start sm:self-center shadow-none active:scale-[0.98]"
          >
            <span>+ {t("howitworks_cta_btn", "Pulsuz elan yerləşdir")}</span>
          </Link>
        </div>
      </section>
    </PublicPage>
  );
}
