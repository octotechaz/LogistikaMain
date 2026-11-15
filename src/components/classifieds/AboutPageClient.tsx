"use client";

import { PublicPage } from "@/components/classifieds/shared";
import { useLocale } from "@/hooks/useLocale";

const ADVANTAGES = [
  {
    title: "Vaxta qənaət",
    description: "Siz sürücü yox, sürücülər sizi axtarır."
  },
  {
    title: "Rahat elan yerləşdirmə"
  },
  {
    title: "Yük növü, nəqliyyat və şəhərə görə axtarış sistemi"
  },
  {
    title: "Sürücülər və daşıma şirkətləri üçün yeni sifariş imkanları"
  },
  {
    title: "Birbaşa zəng və vasitəsiz danışıq imkanı"
  },
  {
    title: "Sürücülər üçün qeydiyyatsız yükə baxış və zəng"
  }
];

export function AboutPageClient() {
  const { t } = useLocale();

  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto w-full max-w-[1280px] min-w-0 px-4 sm:px-[32px] pt-[16px] pb-12">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-[36px] font-extrabold tracking-tight text-[#1B0A33]">
            {t("about_hero_title", "Platforma haqqında")}
          </h1>
          <p className="mt-2 text-sm sm:text-base font-medium text-slate-500 max-w-3xl leading-relaxed">
            {t(
              "about_hero_description",
              "Yük bazarında əlaqəni sürətləndirən, aydın və rahat iş axını təqdim edən elan platformasıdır."
            )}
          </p>
        </div>

        {/* Hero Dark Card */}
        <div className="rounded-[28px] bg-[#20073e] p-8 sm:p-12 lg:p-14 text-white shadow-lg shadow-purple-950/15">
          <h2 className="text-xl sm:text-2xl lg:text-[26px] font-bold leading-snug max-w-3xl text-white">
            {t(
              "about_card_title",
              "Yük sahibləri, sürücülər və daşıma şirkətləri arasında əlaqə yaranmasında kömək edən platformadır."
            )}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-white/70 max-w-2xl leading-relaxed">
            {t(
              "about_card_desc",
              "Yük sahibləri elanlarını pulsuz yerləşdirir, daşıyıcılar uyğun yükləri axtarıb birbaşa əlaqə saxlayırlar."
            )}
          </p>
        </div>

        {/* Section: Əsas üstünlüklər */}
        <div className="mt-10 sm:mt-12">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 mb-6">
            {t("about_advantages_title", "Əsas üstünlüklər")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {ADVANTAGES.map((adv, index) => (
              <div
                key={index}
                className="flex flex-col justify-start min-h-[140px] sm:min-h-[160px] rounded-[24px] bg-white p-7 sm:p-8 border border-slate-100 shadow-sm transition hover:shadow-md"
              >
                <h3 className="text-lg font-bold text-neutral-900 leading-snug">
                  {t(`about_adv_${index}_title`, adv.title)}
                </h3>
                {adv.description ? (
                  <p className="mt-2.5 text-sm font-medium text-slate-500 leading-relaxed">
                    {t(`about_adv_${index}_desc`, adv.description)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
