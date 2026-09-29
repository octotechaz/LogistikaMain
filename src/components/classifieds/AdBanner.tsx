"use client";

/**
 * AdBanner — Dikey reklam alanı (160×600 skyscraper standartı)
 * Mobilde gizlenir, sadece lg+ ekranlarda görünür.
 * İleride slot prop'u ile Google AdSense / özel reklam entegrasyonu yapılabilir.
 */

export type AdSlot = "catalog-left" | "catalog-right";

interface AdBannerProps {
  slot: AdSlot;
  /** Reklam içeriği — boş bırakılırsa placeholder gösterilir */
  children?: React.ReactNode;
}

export function AdBanner({ slot, children }: AdBannerProps) {
  return (
    <div
      data-ad-slot={slot}
      className="hidden lg:flex lg:flex-col lg:items-center"
      style={{ width: 160, minWidth: 160, flexShrink: 0 }}
      aria-label="Reklam sahəsi"
    >
      <div
        className="sticky top-24 flex flex-col items-center justify-start gap-3"
        style={{ width: 160 }}
      >
        {children ?? <AdPlaceholder slot={slot} />}
      </div>
    </div>
  );
}

function AdPlaceholder({ slot }: { slot: AdSlot }) {
  return (
    <div
      style={{ width: 160, height: 600 }}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="5" height="5" rx="1" fill="#94a3b8" />
          <rect x="9" y="2" width="5" height="5" rx="1" fill="#94a3b8" />
          <rect x="2" y="9" width="5" height="5" rx="1" fill="#94a3b8" />
          <rect x="9" y="9" width="5" height="5" rx="1" fill="#cbd5e1" />
        </svg>
      </div>
      <span
        className="text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", letterSpacing: "0.2em" }}
      >
        Reklam sahəsi
      </span>
      <span className="text-[10px] text-slate-300">160 × 600</span>
      <span className="text-[9px] text-slate-300 opacity-60">{slot}</span>
    </div>
  );
}