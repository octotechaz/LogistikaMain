"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { journeyStages } from "@/components/landing/mock-data";

export function ScrollVideoSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [duration, setDuration] = useState(4);

  const stageMarkers = useMemo(
    () =>
      journeyStages.map((label, index) => ({
        label,
        detail: [
          "Step-by-step forma ilə yükləmə, marşrut və sənəd tələblərini tam toplayın.",
          "Carrier tərəfi eyni yük üçün qiymət və müddət üzrə fərqli yanaşmalar təqdim edir.",
          "Büdcə, reys uyğunluğu və xidmət səviyyəsinə görə təklifləri qısa siyahıya salın.",
          "Daşınma zamanı status, checkpoint və əlaqə axını eyni ritmdə işləyir.",
          "Çatdırılma bağlandıqdan sonra növbəti elan üçün eyni axını yenidən istifadə edin."
        ][index]
      })),
    []
  );

  useEffect(() => {
    const handleSync = () => {
      const section = sectionRef.current;
      const video = videoRef.current;
      if (!section || !video) return;

      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight;
      const total = rect.height - viewport;
      const progressed = Math.min(Math.max(viewport - rect.top, 0), total <= 0 ? viewport : rect.height);
      const progress = total <= 0 ? 0 : Math.min(Math.max(progressed / total, 0), 1);

      if (video.readyState >= 2) {
        video.currentTime = progress * duration;
      }

      const nextIndex = Math.min(stageMarkers.length - 1, Math.floor(progress * stageMarkers.length));
      setActiveIndex(nextIndex);
    };

    handleSync();
    window.addEventListener("scroll", handleSync, { passive: true });
    window.addEventListener("resize", handleSync);
    return () => {
      window.removeEventListener("scroll", handleSync);
      window.removeEventListener("resize", handleSync);
    };
  }, [duration, stageMarkers.length]);

  return (
    <section
      id="nece-isleyir"
      ref={sectionRef}
      className="relative z-10 bg-[#020816] px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/65">Journey</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Yükün hərəkətini bir axında idarə edin
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
            Scroll ilə sinxronlaşan media səthi yüklənmədən çatdırılmaya qədər olan mərhələləri bir-bir göstərir və
            hər addım üçün qərar məntiqini yanında saxlayır.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[2rem] border border-white/10 bg-white/6 p-4 shadow-[0_30px_80px_rgba(2,8,23,0.35)] backdrop-blur-2xl">
              <div className="overflow-hidden rounded-[1.6rem] border border-white/8 bg-slate-950/80">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  preload="auto"
                  poster="/assets/images/scroll-video-poster.jpg"
                  onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 4)}
                  className="aspect-video w-full object-cover"
                >
                  <source src="/assets/videos/scroll-video.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {stageMarkers.map((stage, index) => {
              const active = activeIndex === index;
              return (
                <article
                  key={stage.label}
                  className={`rounded-[1.6rem] border p-6 transition duration-300 ${
                    active
                      ? "border-cyan-300/28 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(37,99,235,0.14))] shadow-[0_20px_50px_rgba(14,165,233,0.12)]"
                      : "border-white/8 bg-white/5"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-1 flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium ${
                        active ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-400"
                      }`}
                    >
                      0{index + 1}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-white">{stage.label}</h3>
                      <p className="max-w-2xl text-sm leading-7 text-slate-300">{stage.detail}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
