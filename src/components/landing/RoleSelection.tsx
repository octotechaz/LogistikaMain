"use client";

import { ArrowRight, Boxes, Truck } from "lucide-react";
import { roleCards, type PlatformRole } from "@/components/landing/mock-data";

type RoleSelectionProps = {
  onSelect: (role: PlatformRole) => void;
};

export function RoleSelection({ onSelect }: RoleSelectionProps) {
  return (
    <div className="fixed inset-0 z-[110] bg-[rgba(1,7,18,0.82)] px-4 py-6 backdrop-blur-xl">
      <div className="mx-auto flex min-h-full max-w-6xl items-center">
        <section className="grid w-full gap-8 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,17,35,0.95),rgba(3,9,20,0.98))] p-6 shadow-[0_40px_120px_rgba(2,8,23,0.65)] sm:p-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col justify-between gap-8">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/70">Tranzit.AZ</p>
              <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                Siz platformadan necə istifadə edəcəksiniz?
              </h2>
              <p className="max-w-xl text-base leading-8 text-slate-300">
                Yük sahibi və ya daşıyıcı kimi daxil olun. Növbəti səth həmin qərara uyğun prioritet CTA, copy və
                axınlarla açılacaq.
              </p>
            </div>

            <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-3 text-cyan-100">
                  <Boxes className="h-5 w-5" />
                </div>
                Eyni platformada elan, təklif və qərar axını
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-sky-300/25 bg-sky-300/10 p-3 text-sky-100">
                  <Truck className="h-5 w-5" />
                </div>
                Premium vizual səth, real logistika media və sürətli mock interaksiya
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {roleCards.map((card, index) => {
              const isOwner = card.id === "owner";
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onSelect(card.id)}
                  className="group relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/8 p-6 text-left shadow-[0_30px_80px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-white/12"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.16),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.18),_transparent_40%)] opacity-80 transition duration-300 group-hover:opacity-100" />
                  <div className="relative space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white">
                        {isOwner ? <Boxes className="h-6 w-6" /> : <Truck className="h-6 w-6" />}
                      </div>
                      <span className="text-sm text-slate-400">0{index + 1}</span>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-semibold leading-tight text-white">{card.title}</h3>
                      <p className="text-sm leading-7 text-slate-300">{card.description}</p>
                    </div>
                  </div>

                  <div className="relative mt-8 flex items-center gap-2 text-sm font-medium text-cyan-100">
                    Seçimi davam etdir
                    <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
