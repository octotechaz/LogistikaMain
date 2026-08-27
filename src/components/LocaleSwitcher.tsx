"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALE_LABELS, SUPPORTED_LOCALES, useLocale, type Locale } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils";
import AZ from "country-flag-icons/react/1x1/AZ";
import RU from "country-flag-icons/react/1x1/RU";
import GB from "country-flag-icons/react/1x1/GB";
import TR from "country-flag-icons/react/1x1/TR";

const FLAG_MAP: Record<Locale, React.ComponentType<{ className?: string }>> = {
  az: AZ,
  ru: RU,
  en: GB,
  tr: TR,
};

const LOCALE_NAMES: Record<Locale, string> = {
  az: "Azərbaycan",
  ru: "Русский",
  en: "English",
  tr: "Türkçe",
};

function Flag({ locale, className }: { locale: Locale; className?: string }) {
  const FlagComponent = FLAG_MAP[locale];
  return (
    <span className={cn("overflow-hidden rounded-full", className)} style={{ display: "inline-flex" }}>
      <FlagComponent className="h-full w-full" />
    </span>
  );
}

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Flag locale={locale} className="h-5 w-5 shrink-0" />
        <span>{LOCALE_LABELS[locale]}</span>
        <svg className={cn("h-3.5 w-3.5 text-slate-400 transition-transform", open && "rotate-180")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[200] mt-1.5 w-44 overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
          {SUPPORTED_LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              role="option"
              aria-selected={locale === l}
              onClick={() => { setLocale(l as Locale); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                locale === l
                  ? "bg-orange-50 font-semibold text-logistics-orange"
                  : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <Flag locale={l as Locale} className="h-5 w-5 shrink-0" />
              <span className="flex-1">{LOCALE_NAMES[l as Locale]}</span>
              {locale === l && (
                <svg className="h-4 w-4 text-logistics-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}