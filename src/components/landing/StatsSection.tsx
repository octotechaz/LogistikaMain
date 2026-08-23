"use client";

import { useEffect, useRef, useState } from "react";
import { stats } from "@/components/landing/mock-data";

export function StatsSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="bg-[#020816] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(10,19,35,0.95),rgba(4,10,22,0.98))] p-6 sm:p-8">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/65">Statistics</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">Platforma rəqəmlərlə</h2>
          <p className="mt-4 text-base leading-8 text-slate-300">
            Etibar hissini sadəcə copy ilə yox, ölçülə bilən aktivlik ritmi ilə göstərən counter səthi.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="rounded-[1.6rem] border border-white/8 bg-white/6 p-6">
              <p className="text-4xl font-semibold tracking-tight text-white">
                <CountUp target={item.value} enabled={isVisible} />
                {item.suffix}
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-300">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CountUp({ target, enabled }: { target: number; enabled: boolean }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const totalFrames = 48;

    const tick = () => {
      frame += 1;
      const progress = Math.min(frame / totalFrames, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (frame < totalFrames) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [enabled, target]);

  return <>{value.toLocaleString("az-AZ")}</>;
}
