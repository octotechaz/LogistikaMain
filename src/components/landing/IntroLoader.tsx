"use client";

import { Boxes, Truck } from "lucide-react";
import { useEffect, useState } from "react";

type IntroLoaderProps = {
  onComplete: () => void;
};

export function IntroLoader({ onComplete }: IntroLoaderProps) {
  const [phase, setPhase] = useState<"logo" | "truck">("logo");

  useEffect(() => {
    const swapTimer = window.setTimeout(() => setPhase("truck"), 1450);
    const doneTimer = window.setTimeout(onComplete, 2900);
    return () => {
      window.clearTimeout(swapTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden bg-[#020816]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.2),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.25),_transparent_25%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,16,34,0.92),rgba(2,8,22,0.98))]" />
      <div className="relative flex h-full flex-col items-center justify-center gap-8 px-6 text-center text-white">
        <div className="relative flex h-32 w-32 items-center justify-center">
          <div className="absolute h-32 w-32 rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_0_80px_rgba(34,211,238,0.2)] backdrop-blur-2xl" />
          <Boxes
            className={`absolute h-14 w-14 transition-all duration-700 ${
              phase === "logo" ? "scale-100 opacity-100 blur-0" : "scale-150 opacity-0 blur-md"
            }`}
          />
          <Truck
            className={`absolute h-16 w-16 transition-all duration-700 ${
              phase === "truck" ? "scale-100 opacity-100 blur-0" : "scale-75 opacity-0 blur-md"
            }`}
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/70">Tranzit.AZ</p>
          <h1
            className={`text-3xl font-semibold tracking-tight text-white transition-all duration-700 sm:text-4xl ${
              phase === "truck" ? "translate-y-0 opacity-100" : "translate-y-2 opacity-80"
            }`}
          >
            Premium yük axını hazırlanır
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
            Platforma açılarkən yük, daşıyıcı və qərar axınını bir səthdə toplayan yeni təcrübə qurulur.
          </p>
        </div>

        <div className="h-px w-40 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 transition-all duration-[2800ms] ${
              phase === "truck" ? "w-full" : "w-1/3"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
