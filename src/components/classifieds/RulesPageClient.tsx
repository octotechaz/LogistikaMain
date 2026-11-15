"use client";

import Link from "next/link";
import {
  Layers,
  CheckSquare,
  Ban,
  MapPin,
  Navigation,
  Boxes,
  Truck,
  Scale,
  Calendar,
  Phone,
  Check,
  AlertTriangle,
  XCircle,
  Frown,
  Megaphone,
  AlertCircle,
  HelpCircle,
  ShieldCheck
} from "lucide-react";
import { PublicPage } from "@/components/classifieds/shared";
import { useLocale } from "@/hooks/useLocale";

export function RulesPageClient() {
  const { t } = useLocale();

  return (
    <PublicPage emphasizeBackground>
      <section className="mx-auto w-full max-w-[1280px] min-w-0 px-4 sm:px-[32px] pt-[16px] pb-16">
        {/* Top Header Badge */}
        <div className="mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEDE47] text-slate-900 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" />
            {t("rules_badge", "Platforma Standartları")}
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-[36px] font-extrabold tracking-tight text-[#1B0A33]">
            {t("rules_title", "Qaydalar")}
          </h1>
          <p className="mt-2 text-sm sm:text-base font-medium text-slate-500 max-w-3xl leading-relaxed">
            {t(
              "rules_desc",
              "Elanların keyfiyyətli və etibarlı görünməsi üçün məlumatlar aydın, dəqiq və düzgün paylaşılmalıdır."
            )}
          </p>
        </div>

        {/* Two Columns Grid: Required info (Left) + Prohibited (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Left Card: Required Details */}
          <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#20073e] flex items-center justify-center shrink-0">
                  <CheckSquare className="w-5 h-5 text-[#20073e]" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#1B0A33]">
                    Yük sahibi məlumatları dəqiq göstərməlidir
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Uğurlu və sürətli razılaşma üçün tələb olunan detallar
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span className="text-sm font-semibold text-slate-800">Yükləmə şəhəri</span>
                  </div>
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span className="text-sm font-semibold text-slate-800">Çatdırılma şəhəri</span>
                  </div>
                  <Navigation className="w-4 h-4 text-slate-400 shrink-0" />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span className="text-sm font-semibold text-slate-800">Yük növü</span>
                  </div>
                  <Boxes className="w-4 h-4 text-slate-400 shrink-0" />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span className="text-sm font-semibold text-slate-800">Ehtimal olunan nəqliyyat növü</span>
                  </div>
                  <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span className="text-sm font-semibold text-slate-800">Yükün çəkisi, həcmi və ölçüləri</span>
                  </div>
                  <Scale className="w-4 h-4 text-slate-400 shrink-0" />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span className="text-sm font-semibold text-slate-800">Daşınma tarixi</span>
                  </div>
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span className="text-sm font-semibold text-slate-800">Əlaqə məlumatları</span>
                  </div>
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              </div>
            </div>

            {/* Yellow Tip Box */}
            <div className="mt-6 p-4 rounded-2xl bg-yellow-50/90 border border-yellow-200/70 flex items-start gap-3">
              <div className="w-5 h-5 rounded bg-slate-900 text-[#FEDE47] flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                Məlumatların dolğun daxil edilməsi yükünüzün daha tez daşıyıcı tapmasına kömək edir.
              </p>
            </div>
          </div>

          {/* Right Card: Prohibited Activities */}
          <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <Ban className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#1B0A33]">
                    Qadağandır
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    İcazə verilməyən fəaliyyətlər və məzmun qaydaları
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    <span className="text-sm font-semibold text-slate-800">
                      Yanlış və aldadıcı elan yerləşdirmək
                    </span>
                  </div>
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    <span className="text-sm font-semibold text-slate-800">
                      Qanunsuz və təhlükəli yüklərlə bağlı elan paylaşmaq
                    </span>
                  </div>
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    <span className="text-sm font-semibold text-slate-800">
                      Başqa istifadəçilərə qarşı hörmətsiz davranmaq
                    </span>
                  </div>
                  <Frown className="w-4 h-4 text-slate-400 shrink-0" />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    <span className="text-sm font-semibold text-slate-800">
                      Platformadan spam və reklam məqsədilə istifadə etmək
                    </span>
                  </div>
                  <Megaphone className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              </div>
            </div>

            <div>
              {/* Red Warning Box */}
              <div className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-red-900 leading-relaxed">
                  <strong className="font-bold text-red-950">Qaydaların pozulması</strong> elanınızın dərhal silinməsinə və hesabınızın məhdudlaşdırılmasına səbəb ola bilər.
                </p>
              </div>

              {/* Bottom Support Link */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  Sualınız və ya şikayətiniz var?
                </span>
                <Link
                  href="/elaqe"
                  className="font-bold text-slate-900 hover:text-yellow-600 transition-colors flex items-center gap-1"
                >
                  Dəstək xidməti →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="mt-10 bg-white rounded-[24px] p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FEDE47] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1B0A33]">
                Təhlükəsiz və Şəffaf Logistika
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Bütün elanlar moderatorlarımız tərəfindən 24/7 yoxlanılır.
              </p>
            </div>
          </div>

          <Link
            href="/loads"
            className="bg-[#20073e] hover:bg-[#2d0a57] text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors shadow-sm whitespace-nowrap self-stretch sm:self-auto text-center"
          >
            Bütün elanlara bax
          </Link>
        </div>
      </section>
    </PublicPage>
  );
}
