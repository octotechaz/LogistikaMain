"use client";

import { useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { carrierLocationOptions } from "@/lib/azerbaijan-map-locations";

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

async function resolveLocationLabel(latitude: number, longitude: number): Promise<string> {
  try {
    const response = await fetch(
      `/api/geocode/reverse?lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}`
    );
    const result = await response.json().catch(() => null);
    if (response.ok && result?.ok && typeof result.data?.label === "string") {
      return result.data.label;
    }
  } catch {
    // Fall back to nearest preset city below.
  }

  let bestLabel: string = carrierLocationOptions[0].label;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const city of carrierLocationOptions) {
    const dLat = city.latitude - latitude;
    const dLng = city.longitude - longitude;
    const distance = dLat * dLat + dLng * dLng;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestLabel = city.label;
    }
  }

  return bestLabel;
}

export function CarrierLocationMapInner({
  selectedLabel,
  selectedLatitude,
  selectedLongitude,
  onSelect,
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
        center={AZ_CENTER}
        zoom={AZ_ZOOM}
        className="h-full min-h-[230px] w-full rounded-none"
        scrollWheelZoom
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onMapClick={handleMapClick} />

        {carrierLocationOptions.map((city) => {
          const active = selectedLabel === city.label;

          return (
            <CircleMarker
              key={city.label}
              center={[city.latitude, city.longitude]}
              radius={active ? 8 : 6}
              pathOptions={{
                color: active ? "#f97316" : "#102033",
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
          <CircleMarker
            center={selectedPosition}
            radius={14}
            pathOptions={{
              color: "#f97316",
              fillColor: "#f97316",
              fillOpacity: 0.18,
              weight: 2,
            }}
          />
        ) : null}
      </MapContainer>

      {resolving ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
          Mövqe müəyyən edilir...
        </div>
      ) : null}
    </div>
  );
}
