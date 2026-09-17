"use client";

import { StaticBulletList, StaticContentCard, StaticPageShell } from "@/components/classifieds/StaticPageShell";
import { useLocale } from "@/hooks/useLocale";

export function RulesPageClient() {
  const { t, tArray } = useLocale();

  return (
    <StaticPageShell
      title={t("rules_title", "Qaydalar")}
      description={t("rules_desc", "Elanların keyfiyyətli və etibarlı görünməsi üçün məlumatlar aydın, dəqiq və düzgün paylaşılmalıdır.")}
    >
      <StaticContentCard>
        <div className="space-y-4 text-[1rem] leading-8 text-slate-600">
          <p>{t("rules_p1", "Platformada elan yerləşdirərkən məlumatlar aydın və düzgün qeyd edilməlidir.")}</p>
          <p>{t("rules_p2", "Yük sahibi aşağıdakı məlumatları mümkün qədər dəqiq göstərməlidir:")}</p>
        </div>
        <div className="mt-5">
          <StaticBulletList
            items={tArray("rules_required_items", [
              "Yükləmə şəhəri",
              "Çatdırılma şəhəri",
              "Yük növü",
              "Ehtimal olunan nəqliyyat növü",
              "Yükün çəkisi, həcmi və ölçüləri",
              "Daşınma tarixi",
              "Əlaqə məlumatları"
            ])}
          />
        </div>
      </StaticContentCard>

      <StaticContentCard>
        <h2 className="text-[1.45rem] font-bold text-navy-900">{t("rules_prohibited_title", "Qadağandır")}</h2>
        <div className="mt-5">
          <StaticBulletList
            items={tArray("rules_prohibited_items", [
              "Yanlış və aldadıcı elan yerləşdirmək",
              "Qanunsuz və təhlükəli yüklərlə bağlı elan paylaşmaq",
              "Başqa istifadəçilərə qarşı hörmətsiz davranmaq",
              "Platformadan spam və reklam məqsədilə istifadə etmək"
            ])}
          />
        </div>
      </StaticContentCard>
    </StaticPageShell>
  );
}