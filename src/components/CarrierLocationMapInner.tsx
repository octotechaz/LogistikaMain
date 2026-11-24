"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { LocateFixed, Loader2 } from "lucide-react";
import "leaflet/dist/leaflet.css";
import {
  carrierLocationOptions,
  resolveLocationLabel,
} from "@/lib/azerbaijan-map-locations";

type LocationSelection = {
  label: string;
  latitude: number;
  longitude: number;
};

type CarrierLocationMapInnerProps = {
  selectedLabel: string;
  selectedLatitude?: number;
  selectedLongitude?: number;
  onSelect: (location: LocationSelection) => void;
  onGetLiveLocation?: () => void;
  isLocating?: boolean;
};

const AZ_CENTER: [number, number] = [40.4093, 47.8671];
const AZ_ZOOM = 7;

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function Recenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, Math.max(map.getZoom(), 11), { duration: 0.8 });
    }
  }, [center, map]);
  return null;
}

export function CarrierLocationMapInner({
  selectedLabel,
  selectedLatitude,
  selectedLongitude,
  onSelect,
  onGetLiveLocation,
  isLocating = false,
}: CarrierLocationMapInnerProps) {
  const [resolving, setResolving] = useState(false);

  const selectedPosition = useMemo<[number, number] | null>(() => {
    if (selectedLatitude != null && selectedLongitude != null) {
      return [selectedLatitude, selectedLongitude];
    }

    const match = carrierLocationOptions.find((city) => city.label === selectedLabel);
    return match ? [match.latitude, match.longitude] : null;
  }, [selectedLabel, selectedLatitude, selectedLongitude]);

  async function handleMapClick(latitude: number, longitude: number) {
    setResolving(true);
    try {
      const label = await resolveLocationLabel(latitude, longitude);
      onSelect({ label, latitude, longitude });
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="relative h-full min-h-[230px] w-full">
      <MapContainer
        center={selectedPosition ?? AZ_CENTER}
        zoom={selectedPosition ? 11 : AZ_ZOOM}
        className="h-full min-h-[230px] w-full rounded-none"
        scrollWheelZoom
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Recenter center={selectedPosition} />
        <MapClickHandler onMapClick={handleMapClick} />

        {carrierLocationOptions.map((city) => {
          const active = selectedLabel === city.label;

          return (
            <CircleMarker
              key={city.label}
              center={[city.latitude, city.longitude]}
              radius={active ? 8 : 6}
              pathOptions={{
                color: active ? "#ea580c" : "#102033",
                fillColor: active ? "#f97316" : "#102033",
                fillOpacity: active ? 1 : 0.85,
                weight: active ? 3 : 2,
              }}
              eventHandlers={{
                click: (event) => {
                  event.originalEvent.stopPropagation();
                  onSelect({
                    label: city.label,
                    latitude: city.latitude,
                    longitude: city.longitude,
                  });
                },
              }}
            >
              <Tooltip
                permanent
                direction="bottom"
                offset={[0, 8]}
                opacity={1}
                interactive={false}
                className={`carrier-map-label${active ? " is-active" : ""}`}
              >
                {city.label}
              </Tooltip>
            </CircleMarker>
          );
        })}

        {selectedPosition ? (
          <>
            <CircleMarker
              center={selectedPosition}
              radius={8}
              pathOptions={{
                color: "#c2410c",
                fillColor: "#ea580c",
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Tooltip
                permanent
                direction="top"
                offset={[0, -10]}
                opacity={0.95}
                className="carrier-map-label is-active font-semibold"
              >
                {selectedLabel || "Seçilmiş mövqe"}
              </Tooltip>
            </CircleMarker>
            <CircleMarker
              center={selectedPosition}
              radius={18}
              pathOptions={{
                color: "#f97316",
                fillColor: "#f97316",
                fillOpacity: 0.25,
                weight: 1.5,
              }}
            />
          </>
        ) : null}
      </MapContainer>

      {onGetLiveLocation ? (
        <button
          type="button"
          onClick={onGetLiveLocation}
          disabled={isLocating}
          className="absolute bottom-3 left-3 z-[400] flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:text-logistics-orange hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          title="Canlı mövqeyi seç"
        >
          {isLocating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-logistics-orange" />
          ) : (
            <LocateFixed className="h-3.5 w-3.5 text-logistics-orange" />
          )}
          <span>{isLocating ? "Mövqe alınır..." : "Konumu avtomatik al"}</span>
        </button>
      ) : null}

      {resolving ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[400] mx-auto flex w-fit items-center gap-2 rounded-xl bg-white/95 px-4 py-2 text-xs font-medium text-slate-600 shadow-md ring-1 ring-slate-200">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-logistics-orange" />
          <span>Mövqe müəyyən edilir...</span>
        </div>
      ) : null}
    </div>
  );
}
