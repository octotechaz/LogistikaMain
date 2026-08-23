"use client";

import { StaticContentCard, StaticPageShell } from "@/components/classifieds/StaticPageShell";
import { useLocale } from "@/hooks/useLocale";

export function TermsPageClient() {
  const { t, tArray } = useLocale();

  const sections = [
    {
      key: "terms_s1",
      title: t("terms_s1_title", "Elanların yerləşdirilməsi və təsdiqi"),
      paragraphs: tArray("terms_s1_paras", ["Platformada yerləşdirilən yük elanları admin tərəfindən yoxlanıldıqdan sonra aktiv edilir. Elan məlumatlarının düzgünlüyünə, əlaqə nömrəsinin işlək olmasına, yük haqqında verilən təsvirin real vəziyyətə uyğun olmasına görə məsuliyyət elan yerləşdirən istifadəçiyə aiddir."])
    },
    {
      key: "terms_s2",
      title: t("terms_s2_title", "Tərəflər arasında razılaşma"),
      paragraphs: tArray("terms_s2_paras", ["Tranzit.AZ yük sahibi ilə daşıyıcı arasında informasiya və əlaqə vasitəsi rolunu oynayır. Qiymət, çatdırılma vaxtı, yükün götürülməsi, daşınması, ödəniş forması və digər şərtlər tərəflər arasında birbaşa razılaşdırılır."])
    },
    {
      key: "terms_s3",
      title: t("terms_s3_title", "Platformanın məsuliyyəti"),
      paragraphs: tArray("terms_s3_paras", ["Platforma daşıma prosesində yaranan gecikmə, yükün zədələnməsi, itməsi, ödəniş mübahisəsi, sürücünün davranışı və ya tərəflər arasında yaranan digər anlaşılmazlıqlara görə birbaşa məsuliyyət daşımır. İstifadəçilər razılaşmadan əvvəl qarşı tərəfin məlumatlarını dəqiqləşdirməlidirlər."])
    },
    {
      key: "terms_s4",
      title: t("terms_s4_title", "Qadağan olunan elanlar"),
      paragraphs: tArray("terms_s4_paras", ["Yanlış, təhqiredici, aldadıcı, qanunsuz və ya üçüncü şəxslərin hüquqlarını pozan elanların yerləşdirilməsi qadağandır. Platforma belə elanları xəbərdarlıq etmədən silmək, istifadəçini məhdudlaşdırmaq və ya bloklamaq hüququnu saxlayır."])
    },
    {
      key: "terms_s5",
      title: t("terms_s5_title", "Elan müddəti və bərpa"),
      paragraphs: tArray("terms_s5_paras", ["Yük elanları istifadəçinin seçdiyi müddət ərzində aktiv qalır. Müddət bitdikdən sonra elan avtomatik olaraq vaxtı keçmiş elanlar bölməsinə düşür. İstifadəçi istədiyi halda elanı yenidən bərpa edərək admin təsdiqinə göndərə bilər."])
    }
  ];

  return (
    <StaticPageShell
      title={t("terms_title", "İstifadə şərtləri")}
      description=""
    >
      <StaticContentCard>
        <div className="space-y-8 text-[1rem] leading-8 text-slate-600">
          <p>{t("terms_intro", "Tranzit.AZ platformasından istifadə edən hər bir istifadəçi bu şərtlərlə razılaşmış hesab olunur. İstifadəçilər yerləşdirdikləri elan məlumatlarının düzgünlüyünə görə məsuliyyət daşıyırlar.")}</p>
          {sections.map((section) => (
            <section key={section.key} className="space-y-3">
              <h2 className="text-[1.18rem] font-semibold text-navy-900">{section.title}</h2>
              {section.paragraphs.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      </StaticContentCard>
    </StaticPageShell>
  );
}