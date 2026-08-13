import type { Metadata } from "next";
import {
  StaticBulletList,
  StaticContentCard,
  StaticPageShell,
  StaticParagraphs
} from "@/components/classifieds/StaticPageShell";

export const metadata: Metadata = {
  title: "Platforma haqqında",
  description:
    "Tranzit.AZ haqqında məlumat: yük sahibləri, sürücülər və daşıma şirkətləri arasında əlaqəni asanlaşdıran onlayn yük elanları platforması."
};

export default function AboutPage() {
  return (
    <StaticPageShell
      title="Platforma haqqında"
      description="Tranzit.AZ yük bazarında əlaqəni sürətləndirən, aydın və rahat iş axını təqdim edən elan platformasıdır."
    >
      <StaticContentCard>
        <StaticParagraphs
          paragraphs={[
            "Tranzit.AZ yük sahibləri, sürücülər və daşıma şirkətləri arasında əlaqəni asanlaşdıran onlayn yük elanları platformasıdır. Məqsədimiz yükünüzün daha asan tapılmasını sürətli, şəffaf və rahat etməkdir.",
            "Platformada yük sahibləri öz elanlarını pulsuz yerləşdirə, sürücülər və daşıma şirkətləri isə uyğun yükləri asanlıqla taparaq əlaqə saxlaya bilərlər."
          ]}
        />
      </StaticContentCard>

      <StaticContentCard>
        <h2 className="text-[1.45rem] font-bold text-navy-900">Əsas üstünlüklər</h2>
        <div className="mt-5">
          <StaticBulletList
            items={[
              "Vaxta qənaət - Siz sürücü yox, sürücülər sizi axtarır.",
              "Rahat elan yerləşdirmə",
              "Yük növü, nəqliyyat və şəhərə görə axtarış sistemi",
              "Sürücülər və daşıma şirkətləri üçün yeni sifariş imkanları",
              "Birbaşa zəng və vasitəsiz danışıq imkanı",
              "Sürücülər üçün qeydiyyat olmadan yük görmə və zəng etmə imkanları"
            ]}
          />
        </div>
      </StaticContentCard>
    </StaticPageShell>
  );
}
