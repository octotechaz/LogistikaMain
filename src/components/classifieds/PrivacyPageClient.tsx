"use client";

import { StaticContentCard, StaticPageShell } from "@/components/classifieds/StaticPageShell";
import { useLocale } from "@/hooks/useLocale";

export function PrivacyPageClient() {
  const { t, tArray } = useLocale();

  const sections = [
    { key: "priv_s1", title: t("priv_s1_title", "Toplanan məlumatlar"), paragraphs: tArray("priv_s1_paras", ["Platformadan istifadə zamanı ad, soyad, telefon nömrəsi, e-poçt ünvanı, şirkət məlumatları, elan məlumatları, yükün götürülmə və çatdırılma ünvanları kimi məlumatlar təqdim oluna bilər. Bu məlumatlar yalnız platformanın əsas funksiyalarının işləməsi üçün istifadə edilir."]) },
    { key: "priv_s2", title: t("priv_s2_title", "Əlaqə məlumatlarının görünməsi"), paragraphs: tArray("priv_s2_paras", ["Yük elanlarında göstərilən əlaqə nömrəsi daşıyıcıların yük sahibi ilə birbaşa əlaqə saxlaması üçün açıq şəkildə görünür. İstifadəçi elan yerləşdirməklə həmin əlaqə məlumatının elan daxilində göstərilməsinə razılıq vermiş sayılır."]) },
    { key: "priv_s3", title: t("priv_s3_title", "Məlumatların istifadəsi"), paragraphs: tArray("priv_s3_paras", ["Təqdim edilən məlumatlar qeydiyyatın aparılması, elanların idarə olunması, admin təsdiqi, istifadəçi kabinetinin işləməsi, elanların axtarışda göstərilməsi və xidmət keyfiyyətinin yaxşılaşdırılması məqsədilə istifadə olunur."]) },
    { key: "priv_s4", title: t("priv_s4_title", "Məlumatların qorunması"), paragraphs: tArray("priv_s4_paras", ["Tranzit.AZ istifadəçi məlumatlarının təhlükəsiz saxlanılması üçün zəruri texniki və təşkilati tədbirlər görməyə çalışır. Bununla yanaşı, internet üzərindən məlumat ötürülməsinin tam risksiz olmadığı istifadəçi tərəfindən qəbul edilir."]) },
    { key: "priv_s5", title: t("priv_s5_title", "Üçüncü tərəflərlə paylaşım"), paragraphs: tArray("priv_s5_paras", ["İstifadəçi məlumatları icazəsiz şəkildə üçüncü şəxslərə satılmır və ötürülmür. Lakin qanunvericiliklə tələb olunan hallarda və ya hüquqi sorğular əsasında müvafiq məlumatlar səlahiyyətli qurumlara təqdim oluna bilər."]) },
    { key: "priv_s6", title: t("priv_s6_title", "Məlumatların yenilənməsi və silinməsi"), paragraphs: tArray("priv_s6_paras", ["İstifadəçi şəxsi kabinetində bəzi məlumatlarını redaktə edə bilər. Məlumatların silinməsi və ya hesabın deaktiv edilməsi ilə bağlı müraciətlər platforma administrasiyası tərəfindən nəzərdən keçirilir."]) },
    { key: "priv_s7", title: t("priv_s7_title", "Cookie və texniki məlumatlar"), paragraphs: tArray("priv_s7_paras", ["Platforma istifadəçi təcrübəsini yaxşılaşdırmaq, giriş sessiyasını yadda saxlamaq və saytın düzgün işləməsini təmin etmək üçün cookie və oxşar texniki məlumatlardan istifadə edə bilər."]) },
    { key: "priv_s8", title: t("priv_s8_title", "Razılıq"), paragraphs: tArray("priv_s8_paras", ["İstifadəçi platformadan istifadə etməklə bu məxfilik siyasətinin şərtlərini qəbul etmiş hesab olunur. Məxfilik siyasətində dəyişiklik edildikdə, yenilənmiş mətn saytda dərc olunduğu andan qüvvəyə minir."]) },
  ];

  return (
    <StaticPageShell title={t("priv_title", "Məxfilik siyasəti")} description="">
      <StaticContentCard>
        <div className="space-y-8 text-[1rem] leading-8 text-slate-600">
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