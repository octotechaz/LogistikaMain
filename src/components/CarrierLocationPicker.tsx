"use client";

import { MapPin } from "lucide-react";
import { carrierLocationOptions } from "@/lib/constants";
import { cn } from "@/lib/utils";

type CarrierLocationPickerProps = {
  selectedLabel: string;
  onSelect: (location: {
    label: string;
    latitude: number;
    longitude: number;
  }) => void;
  error?: string;
};

export function CarrierLocationPicker({
  selectedLabel,
  onSelect,
  error
}: CarrierLocationPickerProps) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <MapPin className="h-4 w-4 text-logistics-orange" />
            Xəritədən mövqeyi seçin
          </div>
          <p className="mt-1 text-xs leading-6 text-slate-500">
            Nöqtələr üzərinə klik edin. Sonra dəqiq ünvanı aşağıdakı xanada yaza bilərsiniz.
          </p>
        </div>

        <div className="relative aspect-[1.7/1] min-h-[230px] bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#eaf2ff_38%,#f8fafc_100%)] px-4 py-4">
          <div className="absolute inset-x-8 top-7 h-px rotate-[8deg] bg-white/90" />
          <div className="absolute left-10 top-20 h-px w-[72%] rotate-[-10deg] bg-white/70" />
          <div className="absolute bottom-12 left-14 h-px w-[58%] rotate-[12deg] bg-white/70" />
          <div className="absolute right-14 top-8 h-[78%] w-[42%] rounded-full bg-cyan-100/35 blur-3xl" />

          {carrierLocationOptions.map((location) => {
            const active = selectedLabel === location.label;

            return (
              <button
                key={location.label}
                type="button"
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${location.x}%`, top: `${location.y}%` }}
                onClick={() => onSelect(location)}
              >
                <span
                  className={cn(
                    "relative flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-navy-900 shadow-[0_6px_16px_rgba(15,23,42,0.16)] transition duration-200 group-hover:scale-110",
                    active && "scale-110 bg-logistics-orange"
                  )}
                >
                  <span
                    className={cn(
                      "absolute inset-0 rounded-full ring-8 ring-logistics-orange/0 transition",
                      active && "ring-logistics-orange/15"
                    )}
                  />
                </span>
                <span
                  className={cn(
                    "mt-2 block whitespace-nowrap rounded-full border border-slate-200 bg-white/92 px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition duration-200",
                    active && "border-orange-200 bg-orange-50 text-logistics-orange"
                  )}
                >
                  {location.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={cn(
          "rounded-[14px] border px-3 py-2 text-sm",
          selectedLabel
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-50 text-slate-500"
        )}
      >
        {selectedLabel ? `Seçilən mövqe: ${selectedLabel}` : "Hələ xəritədə mövqe seçilməyib."}
      </div>

      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
