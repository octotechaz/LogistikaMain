"use client";

import { LOCALE_LABELS, SUPPORTED_LOCALES, useLocale, type Locale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div className={cn("flex items-center gap-0.5 rounded-[10px] border border-slate-200 bg-white p-0.5", className)}>
      {SUPPORTED_LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l as Locale)}
          className={cn(
            "rounded-[8px] px-2 py-1 text-xs font-semibold transition-colors",
            locale === l
              ? "bg-logistics-orange text-white shadow-sm"
              : "text-slate-500 hover:text-navy-900"
          )}
        >
          {LOCALE_LABELS[l as Locale]}
        </button>
      ))}
    </div>
  );
}