import type { Metadata } from "next";
import { StaticContentCard, StaticPageShell } from "@/components/classifieds/StaticPageShell";

export const metadata: Metadata = {
  title: "Məxfilik siyasəti",
  description:
    "Tranzit.AZ istifadəçi məlumatlarının necə toplandığını, istifadə edildiyini və qorunduğunu izah edən məxfilik siyasəti."
};

const sections = [
  {
    title: "Toplanan məlumatlar",
    paragraphs: [
      "Platformadan istifadə zamanı ad, soyad, telefon nömrəsi, e-poçt ünvanı, şirkət məlumatları, elan məlumatları, yükün götürülmə və çatdırılma ünvanları kimi məlumatlar təqdim oluna bilər. Bu məlumatlar yalnız platformanın əsas funksiyalarının işləməsi üçün istifadə edilir."
    ]
  },
  {
    title: "Əlaqə məlumatlarının görünməsi",
    paragraphs: [
      "Yük elanlarında göstərilən əlaqə nömrəsi daşıyıcıların yük sahibi ilə birbaşa əlaqə saxlaması üçün açıq şəkildə görünür. İstifadəçi elan yerləşdirməklə həmin əlaqə məlumatının elan daxilində göstərilməsinə razılıq vermiş sayılır."
    ]
  },
  {
    title: "Məlumatların istifadəsi",
    paragraphs: [
      "Təqdim edilən məlumatlar qeydiyyatın aparılması, elanların idarə olunması, admin təsdiqi, istifadəçi kabinetinin işləməsi, elanların axtarışda göstərilməsi və xidmət keyfiyyətinin yaxşılaşdırılması məqsədilə istifadə olunur."
    ]
  },
  {
    title: "Məlumatların qorunması",
    paragraphs: [
      "Tranzit.AZ istifadəçi məlumatlarının təhlükəsiz saxlanılması üçün zəruri texniki və təşkilati tədbirlər görməyə çalışır. Bununla yanaşı, internet üzərindən məlumat ötürülməsinin tam risksiz olmadığı istifadəçi tərəfindən qəbul edilir."
    ]
  },
  {
    title: "Üçüncü tərəflərlə paylaşım",
    paragraphs: [
      "İstifadəçi məlumatları icazəsiz şəkildə üçüncü şəxslərə satılmır və ötürülmür. Lakin qanunvericiliklə tələb olunan hallarda və ya hüquqi sorğular əsasında müvafiq məlumatlar səlahiyyətli qurumlara təqdim oluna bilər."
    ]
  },
  {
    title: "Məlumatların yenilənməsi və silinməsi",
    paragraphs: [
      "İstifadəçi şəxsi kabinetində bəzi məlumatlarını redaktə edə bilər. Məlumatların silinməsi və ya hesabın deaktiv edilməsi ilə bağlı müraciətlər platforma administrasiyası tərəfindən nəzərdən keçirilir."
    ]
  },
  {
    title: "Cookie və texniki məlumatlar",
    paragraphs: [
      "Platforma istifadəçi təcrübəsini yaxşılaşdırmaq, giriş sessiyasını yadda saxlamaq və saytın düzgün işləməsini təmin etmək üçün cookie və oxşar texniki məlumatlardan istifadə edə bilər."
    ]
  },
  {
    title: "Razılıq",
    paragraphs: [
      "İstifadəçi platformadan istifadə etməklə bu məxfilik siyasətinin şərtlərini qəbul etmiş hesab olunur. Məxfilik siyasətində dəyişiklik edildikdə, yenilənmiş mətn saytda dərc olunduğu andan qüvvəyə minir."
    ]
  }
];

export default function PrivacyPage() {
  return (
    <StaticPageShell title="Məxfilik siyasəti" description="">
      <StaticContentCard>
        <div className="space-y-8 text-[1rem] leading-8 text-slate-600">
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
