import type { Metadata } from "next";
import {
  StaticBulletList,
  StaticContentCard,
  StaticPageShell,
  StaticParagraphs
} from "@/components/classifieds/StaticPageShell";

export const metadata: Metadata = {
  title: "Qaydalar",
  description:
    "Tranzit.AZ platformasında elan yerləşdirmə qaydaları, tələb olunan məlumatlar və qadağan edilən davranışlar."
};

export default function RulesPage() {
  return (
    <StaticPageShell
      title="Qaydalar"
      description="Elanların keyfiyyətli və etibarlı görünməsi üçün məlumatlar aydın, dəqiq və düzgün paylaşılmalıdır."
    >
      <StaticContentCard>
        <StaticParagraphs
          paragraphs={[
            "Platformada elan yerləşdirərkən məlumatlar aydın və düzgün qeyd edilməlidir.",
            "Yük sahibi aşağıdakı məlumatları mümkün qədər dəqiq göstərməlidir:"
          ]}
        />
        <div className="mt-5">
          <StaticBulletList
            items={[
              "Yükləmə şəhəri",
              "Çatdırılma şəhəri",
              "Yük növü",
              "Ehtimal olunan nəqliyyat növü",
              "Yükün çəkisi, həcmi və ölçüləri",
              "Daşınma tarixi",
              "Əlaqə məlumatları"
            ]}
          />
        </div>
      </StaticContentCard>

      <StaticContentCard>
        <h2 className="text-[1.45rem] font-bold text-navy-900">Qadağandır</h2>
        <div className="mt-5">
          <StaticBulletList
            items={[
              "Yanlış və aldadıcı elan yerləşdirmək",
              "Qanunsuz və təhlükəli yüklərlə bağlı elan paylaşmaq",
              "Başqa istifadəçilərə qarşı hörmətsiz davranmaq",
              "Platformadan spam və reklam məqsədilə istifadə etmək"
            ]}
          />
        </div>
      </StaticContentCard>
    </StaticPageShell>
  );
}
