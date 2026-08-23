"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const CarrierLocationMapInner = dynamic(
  () =>
    import("@/components/CarrierLocationMapInner").then(
      (module) => module.CarrierLocationMapInner
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[230px] items-center justify-center bg-slate-50 text-sm text-slate-500">
        Xəritə yüklənir...
      </div>
    ),
  }
);

type CarrierLocationPickerProps = {
  selectedLabel: string;
  selectedLatitude?: number;
  selectedLongitude?: number;
  onSelect: (location: {
    label: string;
    latitude: number;
    longitude: number;
  }) => void;
  error?: string;
};

export function CarrierLocationPicker({
  selectedLabel,
  selectedLatitude,
  selectedLongitude,
  onSelect,
  error,
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
            Xəritədə şəhərə klik edin və ya istədiyiniz nöqtəni seçin. Sonra dəqiq ünvanı aşağıdakı xanada yaza bilərsiniz.
          </p>
        </div>

        <div className="relative aspect-[1.7/1] min-h-[230px] overflow-hidden bg-slate-100">
          <CarrierLocationMapInner
            selectedLabel={selectedLabel}
            selectedLatitude={selectedLatitude}
            selectedLongitude={selectedLongitude}
            onSelect={onSelect}
          />
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
