"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  Handshake,
  Scale,
  Ban,
  Clock,
  RotateCcw,
  Check,
  Repeat,
  Info,
  AlertTriangle,
  Headphones,
  ArrowRight
} from "lucide-react";
import { PublicPage } from "@/components/classifieds/shared";
import { useLocale } from "@/hooks/useLocale";

export function TermsPageClient() {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");

  const articles = [
    {
      num: "01",
      title: "Elanların yerləşdirilməsi və təsdiqi",
      desc: "Platformada yerləşdirilən yük elanları admin tərəfindən yoxlanıldıqdan sonra aktiv edilir. Elan məlumatlarının düzgünlüyünə və əlaqə nömrəsinin işlək olmasına elan sahibi cavabdehdir.",
      icon: ShieldCheck,
      tagIcon: Check,
      tagText: "Admin təsdiqi tələb olunur",
      tagColor: "text-slate-500",
      tagIconColor: "text-emerald-600"
    },
    {
      num: "02",
      title: "Tərəflər arasında razılaşma",
      desc: "Tranzit.AZ informasiya və əlaqə vasitəsi rolunu oynayır. Qiymət, çatdırılma vaxtı, daşınma və ödəniş şərtləri tərəflər arasında birbaşa razılaşdırılır.",
      icon: Handshake,
      tagIcon: Repeat,
      tagText: "Birbaşa tərəfdaşlıq",
      tagColor: "text-slate-500",
      tagIconColor: "text-slate-600"
    },
    {
      num: "03",
      title: "Platformanın məsuliyyəti",
      desc: "Platforma daşınma zamanı yaranan gecikmə, yükün zədələnməsi və ya tərəflər arasında yaranan digər anlaşılmazlıqlara görə birbaşa məsuliyyət daşımır.",
      icon: Scale,
      tagIcon: Info,
      tagText: "İnformasiya vasitəçisi",
      tagColor: "text-slate-500",
      tagIconColor: "text-slate-400"
    },
    {
      num: "04",
      title: "Qadağan olunan elanlar",
      desc: "Yanlış, təhqiredici, aldadıcı, qanunsuz və ya üçüncü şəxslərin hüquqlarını pozan elanların yerləşdirilməsi qadağandır.",
      icon: Ban,
      tagIcon: AlertTriangle,
      tagText: "Ciddi moderasiya qaydaları",
      tagColor: "text-red-600 font-semibold",
      tagIconColor: "text-red-500"
    }
  ];

  const filteredArticles = articles.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto w-full max-w-[1280px] min-w-0 px-4 sm:px-[32px] pt-[16px] pb-16">
        {/* Top Header Badge */}
        <div className="mb-2">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
            <span className="w-2 h-2 rounded-full bg-[#FEDE47]"></span>
            {t("terms_badge", "HÜQUQİ TƏNZİMLƏMƏ")}
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-[36px] font-extrabold tracking-tight text-[#1B0A33]">
            {t("terms_title", "İstifadə şərtləri")}
          </h1>
          <p className="mt-2 text-sm sm:text-base font-medium text-slate-500 max-w-3xl leading-relaxed">
            Tranzit.AZ platformasından istifadə edən hər bir istifadəçi bu şərtlərlə razılaşmış hesab olunur. İstifadəçilər yerləşdirdikləri elan məlumatlarının düzgünlüyünə görə məsuliyyət daşıyırlar.
          </p>
        </div>

        {/* Version & Search Bar Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#20073e] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#20073e]" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Qüvvədə olma tarixi</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Son yenilənmə: 1 Mart 2025 • Versiya 2.4
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Maddələr üzrə axtarış..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
            />
          </div>
        </div>

        {/* 2x2 Articles Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredArticles.map((art) => {
            const Icon = art.icon;
            const TagIcon = art.tagIcon;

            return (
              <div
                key={art.num}
                className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-100 border-t-4 border-t-[#FEDE47] shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full bg-[#FEDE47] text-slate-900 text-xs font-black tracking-wider">
                      {art.num}
                    </span>
                    <Icon className="w-5 h-5 text-slate-400" />
                  </div>

                  <h3 className="text-lg font-bold text-[#1B0A33] mt-3">
                    {art.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2">
                    {art.desc}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center gap-1.5 text-xs">
                  <TagIcon className={`w-3.5 h-3.5 ${art.tagIconColor}`} />
                  <span className={art.tagColor}>{art.tagText}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Card 05: Elan müddəti və bərpa (Full Width) */}
        <div className="mt-6 bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 border-t-4 border-t-[#FEDE47] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex px-2.5 py-0.5 rounded-full bg-[#FEDE47] text-slate-900 text-xs font-black tracking-wider">
                05
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                AVTOMATLAŞDIRILMIŞ STATUS
              </span>
            </div>

            <h3 className="text-xl font-bold text-[#1B0A33]">
              Elan müddəti və bərpa
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1.5">
              Elan müddəti bitdikdən sonra vaxtı keçmiş elanlar bölməsinə düşür. İstifadəçi onu yenidən bərpa edib admin təsdiqinə göndərə bilər.
            </p>

            <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span>Şəxsi kabinet üzərindən idarəetmə</span>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3 shrink-0 self-stretch md:self-auto">
            <div className="p-4 rounded-xl bg-yellow-50/80 border border-yellow-200/70 flex items-center gap-3.5 w-full md:w-auto">
              <div className="w-10 h-10 rounded-xl bg-[#FEDE47] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-slate-900" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Standart aktivlik: 30 gün</p>
                <p className="text-xs text-slate-500">Müddət bitdikdə kabinetdən yenilənir</p>
              </div>
            </div>

            <Link
              href="/cargo-owner/dashboard"
              className="text-xs font-bold text-[#1B0A33] hover:text-yellow-600 flex items-center gap-1 transition-colors self-end"
            >
              Şəxsi kabinetə keçid →
            </Link>
          </div>
        </div>

        {/* Bottom Contact Banner */}
        <div className="mt-10 bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FEDE47] flex items-center justify-center shrink-0">
              <Headphones className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1B0A33]">
                Suallarınız və ya qeydləriniz var?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Hüquqi və ya texniki məsələlərlə bağlı dəstək xidmətimiz həmişə kömək etməyə hazırdır.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto justify-end">
            <a
              href="mailto:info@tranzit.az"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-sm transition-colors"
            >
              info@tranzit.az
            </a>
            <a
              href="tel:+994501234567"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#FEDE47] hover:bg-yellow-400 text-slate-900 font-bold text-sm transition-colors shadow-sm"
            >
              +994 50 123 45 67
            </a>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
