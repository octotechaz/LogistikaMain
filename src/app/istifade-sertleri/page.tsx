import type { Metadata } from "next";
import { StaticContentCard, StaticPageShell } from "@/components/classifieds/StaticPageShell";

export const metadata: Metadata = {
  title: "İstifadə şərtləri",
  description:
    "Tranzit.AZ platformasından istifadə qaydaları, elanların yerləşdirilməsi və istifadəçilərin məsuliyyətləri haqqında şərtlər."
};

const sections = [
  {
    title: "Elanların yerləşdirilməsi və təsdiqi",
    paragraphs: [
      "Platformada yerləşdirilən yük elanları admin tərəfindən yoxlanıldıqdan sonra aktiv edilir. Elan məlumatlarının düzgünlüyünə, əlaqə nömrəsinin işlək olmasına, yük haqqında verilən təsvirin real vəziyyətə uyğun olmasına görə məsuliyyət elan yerləşdirən istifadəçiyə aiddir."
    ]
  },
  {
    title: "Tərəflər arasında razılaşma",
    paragraphs: [
      "Tranzit.AZ yük sahibi ilə daşıyıcı arasında informasiya və əlaqə vasitəsi rolunu oynayır. Qiymət, çatdırılma vaxtı, yükün götürülməsi, daşınması, ödəniş forması və digər şərtlər tərəflər arasında birbaşa razılaşdırılır."
    ]
  },
  {
    title: "Platformanın məsuliyyəti",
    paragraphs: [
      "Platforma daşıma prosesində yaranan gecikmə, yükün zədələnməsi, itməsi, ödəniş mübahisəsi, sürücünün davranışı və ya tərəflər arasında yaranan digər anlaşılmazlıqlara görə birbaşa məsuliyyət daşımır. İstifadəçilər razılaşmadan əvvəl qarşı tərəfin məlumatlarını dəqiqləşdirməlidirlər."
    ]
  },
  {
    title: "Qadağan olunan elanlar",
    paragraphs: [
      "Yanlış, təhqiredici, aldadıcı, qanunsuz və ya üçüncü şəxslərin hüquqlarını pozan elanların yerləşdirilməsi qadağandır. Platforma belə elanları xəbərdarlıq etmədən silmək, istifadəçini məhdudlaşdırmaq və ya bloklamaq hüququnu saxlayır."
    ]
  },
  {
    title: "Elan müddəti və bərpa",
    paragraphs: [
      "Yük elanları istifadəçinin seçdiyi müddət ərzində aktiv qalır. Müddət bitdikdən sonra elan avtomatik olaraq vaxtı keçmiş elanlar bölməsinə düşür. İstifadəçi istədiyi halda elanı yenidən bərpa edərək admin təsdiqinə göndərə bilər."
    ]
  }
];

export default function TermsPage() {
  return (
    <StaticPageShell title="İstifadə şərtləri" description="">
      <StaticContentCard>
        <div className="space-y-8 text-[1rem] leading-8 text-slate-600">
          <p>
            Tranzit.AZ platformasından istifadə edən hər bir istifadəçi bu şərtlərlə razılaşmış hesab olunur.
            İstifadəçilər yerləşdirdikləri elan məlumatlarının düzgünlüyünə görə məsuliyyət daşıyırlar.
          </p>

          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-[1.18rem] font-semibold text-navy-900">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      </StaticContentCard>
    </StaticPageShell>
  );
}
