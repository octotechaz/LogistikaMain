"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { PageSection, PublicPage } from "@/components/classifieds/shared";
import { StaticContentCard } from "@/components/classifieds/StaticPageShell";

const DEFAULTS = {
  about_hero_title: "Platforma haqqında",
  about_hero_description: "Tranzit.AZ yük bazarında əlaqəni sürətləndirən, aydın və rahat iş axını təqdim edən elan platformasıdır.",
  about_paragraphs: [
    "Tranzit.AZ yük sahibləri, sürücülər və daşıma şirkətləri arasında əlaqəni asanlaşdıran onlayn yük elanları platformasıdır. Məqsədimiz yükünüzün daha asan tapılmasını sürətli, şəffaf və rahat etməkdir.",
    "Platformada yük sahibləri öz elanlarını pulsuz yerləşdirə, sürücülər və daşıma şirkətləri isə uyğun yükləri asanlıqla taparaq əlaqə saxlaya bilərlər."
  ],
  about_advantages: [
    "Vaxta qənaət - Siz sürücü yox, sürücülər sizi axtarır.",
    "Rahat elan yerləşdirmə",
    "Yük növü, nəqliyyat və şəhərə görə axtarış sistemi",
    "Sürücülər və daşıma şirkətləri üçün yeni sifariş imkanları",
    "Birbaşa zəng və vasitəsiz danışıq imkanı",
    "Sürücülər üçün qeydiyyat olmadan yük görmə və zəng etmə imkanları"
  ],
};

export function AboutPageClient() {
  const [title, setTitle] = useState(DEFAULTS.about_hero_title);
  const [description, setDescription] = useState(DEFAULTS.about_hero_description);
  const [paragraphs, setParagraphs] = useState<string[]>(DEFAULTS.about_paragraphs);
  const [advantages, setAdvantages] = useState<string[]>(DEFAULTS.about_advantages);

  useEffect(() => {
    const locale = typeof window !== "undefined"
      ? (localStorage.getItem("tranzit_locale") || "az")
      : "az";

    fetch(`/api/public/page-content?locale=${locale}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        if (d.about_hero_title) setTitle(d.about_hero_title);
        if (d.about_hero_description) setDescription(d.about_hero_description);
        if (Array.isArray(d.about_paragraphs)) setParagraphs(d.about_paragraphs);
        if (Array.isArray(d.about_advantages)) setAdvantages(d.about_advantages);
      })
      .catch(() => {});
  }, []);

  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto w-full max-w-[1160px] px-4 py-8 sm:px-6 lg:px-8">
        <PageSection title={title} description={description} />
        <div className="mt-8 space-y-6">
          <StaticContentCard>
            <div className="space-y-4 text-[1rem] leading-8 text-slate-600">
              {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </StaticContentCard>

          <StaticContentCard>
            <h2 className="text-[1.45rem] font-bold text-navy-900">Əsas üstünlüklər</h2>
            <div className="mt-5">
              <ul className="grid gap-3 text-[0.98rem] text-slate-700 sm:grid-cols-2">
                {advantages.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-[16px] border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-logistics-orange" />
                    <span className="leading-7">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </StaticContentCard>
        </div>
      </section>
    </PublicPage>
  );
}