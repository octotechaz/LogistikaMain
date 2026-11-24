"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { AlertCircle, CheckCircle2, Loader2, LocateFixed, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/useLocale";
import { resolveLocationLabel } from "@/lib/azerbaijan-map-locations";

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

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

export function CarrierLocationPicker({
  selectedLabel,
  selectedLatitude,
  selectedLongitude,
  onSelect,
  error,
}: CarrierLocationPickerProps) {
  const { t } = useLocale();
  const [isLocating, setIsLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

  const handleGetLiveLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator?.geolocation) {
      setStatusMessage({
        type: "error",
        text: "Brauzeriniz canlı məkana girişi dəstəkləmir.",
      });
      return;
    }

    setIsLocating(true);
    setStatusMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const isWithinAzerbaijan =
          latitude >= 38 && latitude <= 42.5 && longitude >= 44 && longitude <= 51.5;

        try {
          const label = await resolveLocationLabel(latitude, longitude);
          onSelect({
            label,
            latitude,
            longitude,
          });

          if (!isWithinAzerbaijan) {
            setStatusMessage({
              type: "info",
              text: `Cari mövqeyiniz (${label}) seçildi. Qeyd: Xidmət əsasən Azərbaycan ərazisini əhatə edir.`,
            });
          } else {
            setStatusMessage({
              type: "success",
              text: `Canlı mövqe uğurla təyin edildi: ${label}`,
            });
          }
        } catch {
          onSelect({
            label: "Cari mövqe",
            latitude,
            longitude,
          });
          setStatusMessage({
            type: "success",
            text: "Canlı mövqeyiniz təyin edildi.",
          });
        } finally {
          setIsLocating(false);
        }
      },
      (geoError) => {
        setIsLocating(false);
        let errorMsg = "Canlı mövqeni əldə etmək mümkün olmadı.";
        if (geoError.code === geoError.PERMISSION_DENIED) {
          errorMsg = "Məkan icazəsi verilmədi. Zəhmət olmasa brauzer tənzimləmələrindən məkan icazəsini aktivləşdirin.";
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          errorMsg = "Cari mövqe məlumatı əlçatan deyil.";
        } else if (geoError.code === geoError.TIMEOUT) {
          errorMsg = "Məkan sorğusunun vaxtı bitdi. Zəhmət olmasa yenidən cəhd edin.";
        }
        setStatusMessage({
          type: "error",
          text: errorMsg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [onSelect]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <MapPin className="h-4 w-4 text-logistics-orange" />
              Xəritədən mövqeyi seçin
            </div>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              Xəritədə şəhərə klik edin və ya istədiyiniz nöqtəni seçin. Sonra dəqiq ünvanı aşağıdakı xanada yaza bilərsiniz.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGetLiveLocation}
            disabled={isLocating}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-semibold text-logistics-orange shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            title="Cari canlı məkanınızı xəritədə seçin"
          >
            {isLocating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-logistics-orange" />
                <span>{t("carrier_locating", "Mövqe alınır...")}</span>
              </>
            ) : (
              <>
                <LocateFixed className="h-4 w-4 text-logistics-orange" />
                <span>{t("carrier_auto_location", "Konumu avtomatik al")}</span>
              </>
            )}
          </button>
        </div>

        <div className="relative aspect-[1.7/1] min-h-[230px] overflow-hidden bg-slate-100">
          <CarrierLocationMapInner
            selectedLabel={selectedLabel}
            selectedLatitude={selectedLatitude}
            selectedLongitude={selectedLongitude}
            onSelect={(location) => {
              setStatusMessage(null);
              onSelect(location);
            }}
            onGetLiveLocation={handleGetLiveLocation}
            isLocating={isLocating}
          />
        </div>
      </div>

      {statusMessage ? (
        <div
          className={cn(
            "flex items-center gap-2 rounded-[14px] border px-3 py-2 text-xs font-medium",
            statusMessage.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : statusMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
          )}
        >
          {statusMessage.type === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-center justify-between rounded-[14px] border px-3 py-2.5 text-sm transition-colors",
          selectedLabel
            ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
            : "border-slate-200 bg-slate-50 text-slate-500"
        )}
      >
        <div className="flex items-center gap-2">
          <MapPin
            className={cn(
              "h-4 w-4 shrink-0",
              selectedLabel ? "text-emerald-600" : "text-slate-400"
            )}
          />
          <span>
            {selectedLabel ? (
              <>
                <strong className="font-semibold text-emerald-900">Seçilən mövqe:</strong>{" "}
                {selectedLabel}
                {selectedLatitude != null && selectedLongitude != null ? (
                  <span className="ml-2 font-mono text-xs text-emerald-600">
                    ({selectedLatitude.toFixed(4)}, {selectedLongitude.toFixed(4)})
                  </span>
                ) : null}
              </>
            ) : (
              "Hələ xəritədə mövqe seçilməyib."
            )}
          </span>
        </div>
      </div>

      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
