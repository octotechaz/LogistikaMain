"use client";

import { ArrowRight, Boxes, CircleDashed, Route, Truck } from "lucide-react";
import { roleCards, type PlatformRole } from "@/components/landing/mock-data";

type HeroSectionProps = {
  selectedRole: PlatformRole | null;
  onSelectRole: (role: PlatformRole) => void;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
};

export function HeroSection({
  selectedRole,
  onSelectRole,
  onPrimaryAction,
  onSecondaryAction
}: HeroSectionProps) {
  return (
    <section
      id="ana-sehife"
      className="relative min-h-screen overflow-hidden bg-[#020816] px-4 pb-14 pt-28 sm:px-6 lg:px-8"
    >
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster="/assets/images/hero-video-poster.jpg"
      >
        <source src="/assets/videos/background-loop.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(112deg,rgba(2,8,22,0.88),rgba(2,8,22,0.68),rgba(2,8,22,0.92))]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(180deg,rgba(2,8,22,0),rgba(2,8,22,0.86),#020816)]" />

      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <div className="max-w-3xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-cyan-100 backdrop-blur-xl">
            <CircleDashed className="h-4 w-4" />
            Təklif, marşrut və çatdırılma eyni axında
          </div>
          <div className="space-y-6">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-[4.6rem] lg:leading-[1.02]">
              Yüklərinizi daha ağıllı, daha sürətli və daha şəffaf daşıyın
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              Yük sahibləri elan yerləşdirir, sürücülər və logistika şirkətləri real vaxtda təklif verir. Bütün qərar
              nöqtələri bir premium idarəetmə səthində toplanır.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onPrimaryAction}
              className="rounded-full border border-cyan-300/30 bg-[linear-gradient(135deg,#22d3ee,#2563eb)] px-6 py-3.5 text-sm font-medium text-white shadow-[0_18px_46px_rgba(37,99,235,0.35)] transition hover:-translate-y-0.5"
            >
              Yük elanı yerləşdir
            </button>
            <button
              type="button"
              onClick={onSecondaryAction}
              className="rounded-full border border-white/12 bg-white/8 px-6 py-3.5 text-sm font-medium text-white backdrop-blur-xl transition hover:bg-white/12"
            >
              Yüklərə bax
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Aktiv elan axını", value: "1,240+" },
              { label: "Orta cavab tempi", value: "14 dəq" },
              { label: "Tamamlanmış daşımalar", value: "8,700+" }
            ].map((item) => (
              <div key={item.label} className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                <p className="text-2xl font-semibold text-white">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[2rem] border border-white/10 bg-white/8 p-5 shadow-[0_30px_80px_rgba(2,8,23,0.45)] backdrop-blur-2xl">
            <div className="grid gap-4 lg:grid-cols-2">
              {roleCards.map((card) => {
                const active = selectedRole === card.id;
                const isOwner = card.id === "owner";
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => onSelectRole(card.id)}
                    className={`rounded-[1.5rem] border p-5 text-left transition ${
                      active
                        ? "border-cyan-300/35 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(37,99,235,0.16))]"
                        : "border-white/10 bg-slate-950/45 hover:border-white/20 hover:bg-white/8"
                    }`}
                  >
                    <div className="mb-6 flex items-center justify-between">
                      <div className="rounded-2xl border border-white/10 bg-white/8 p-3 text-white">
                        {isOwner ? <Boxes className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                      </div>
                      <ArrowRight className={`h-4 w-4 ${active ? "text-cyan-200" : "text-slate-500"}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{card.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-4 rounded-[1.6rem] border border-white/8 bg-[rgba(5,11,24,0.82)] p-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-3">
                <p className="text-sm text-cyan-200">Canlı yük axını</p>
                <h3 className="text-2xl font-semibold text-white">Təkliflər mərkəzləşir, qərar sürətlənir</h3>
                <p className="text-sm leading-7 text-slate-400">
                  Marşrut, xüsusi tələblər, sənəd və qiymət aralığı eyni kart modelində təqdim olunur.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-100">
                    <Route className="h-4 w-4" />
                  </div>
                  Bakı - Gəncə | 18 ton | 12 təklif
                </div>
                <div className="mt-4 h-28 rounded-[1.2rem] border border-white/8 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(37,99,235,0.2))]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
