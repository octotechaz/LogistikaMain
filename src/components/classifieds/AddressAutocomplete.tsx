"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, X } from "lucide-react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

type PlaceResult = {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
};

interface AddressAutocompleteProps {
  name: string;
  label: React.ReactNode;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  onFieldChange?: () => void;
}

const AZ_CENTER: [number, number] = [40.4093, 47.8671];
const AZ_ZOOM = 13;

const markerIcon = L.divIcon({
  className: "",
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24"
      fill="#ef4444" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      style="filter: drop-shadow(0 3px 4px rgba(0,0,0,0.35)); transform: translate(-19px, -38px);">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>`,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});

function resolveLabel(lat: number, lng: number): Promise<string> {
  return fetch(
    `/api/geocode/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`,
    { cache: "no-store" }
  )
    .then((response) => response.json().catch(() => null))
    .then((result) => {
      const label = result?.data?.label;
      return typeof label === "string" && label ? label : "Seçilmiş yer";
    })
    .catch(() => "Seçilmiş yer");
}

function MapInitializer({
  onLocated,
}: {
  onLocated: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onLocated(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function ReverseLocator({
  position,
  onResolve,
}: {
  position: [number, number];
  onResolve: (label: string) => void;
}) {
  useEffect(() => {
    let cancelled = false;
    resolveLabel(position[0], position[1]).then((label) => {
      if (!cancelled) onResolve(label);
    });
    return () => {
      cancelled = true;
    };
  }, [position[0], position[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function AddressAutocomplete({
  name,
  label,
  defaultValue = "",
  required,
  error,
  onFieldChange
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(defaultValue);
  const [position, setPosition] = useState<[number, number]>(AZ_CENTER);
  const [resolvedLabel, setResolvedLabel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [locateError, setLocateError] = useState<string>("");
  const seededRef = useRef(false);

  useEffect(() => {
    if (defaultValue) setSelected(defaultValue);
  }, [defaultValue]);

  function openModal() {
    setLocateError("");
    setLoading(true);
    setOpen(true);
    seededRef.current = false;
  }

  useEffect(() => {
    if (!open || seededRef.current) return;
    seededRef.current = true;

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (geo) => {
          const lat = geo.coords.latitude;
          const lng = geo.coords.longitude;
          setPosition([lat, lng]);
          resolveLabel(lat, lng).then(setResolvedLabel);
          setLoading(false);
        },
        () => {
          // Fall back to seeding from the existing/default address, then center.
          if (selected) {
            fetch(
              `/api/geocode/search?q=${encodeURIComponent(selected)}`,
              { cache: "no-store" }
            )
              .then((response) => response.json().catch(() => null))
              .then((result) => {
                const place: PlaceResult | undefined = result?.data?.places?.[0];
                if (place && Number.isFinite(place.latitude) && Number.isFinite(place.longitude)) {
                  setPosition([place.latitude, place.longitude]);
                  setResolvedLabel(place.label);
                }
              })
              .finally(() => setLoading(false));
          } else {
            setLoading(false);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    } else {
      setLoading(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePositionChange = useCallback((lat: number, lng: number) => {
    setPosition([lat, lng]);
    setSelected("");
    setResolvedLabel("");
    onFieldChange?.();
  }, [onFieldChange]);

  function handleConfirm() {
    const value = resolvedLabel || selected || "Seçilmiş yer";
    setSelected(value);
    setOpen(false);
    onFieldChange?.();
  }

  return (
    <div className="form-group mb-0">
      <label className="text-[13px] font-semibold text-slate-600 mb-1.5 block">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>

      <input
        type="hidden"
        name={name}
        value={selected}
        required={required}
      />

      <button
        type="button"
        onClick={openModal}
        aria-label={typeof label === "string" ? label : name}
        style={{ height: 60 }}
        className={cn(
          "flex w-full items-center gap-3 rounded-[15px] border bg-white px-4 text-left text-[16px] text-slate-800 shadow-sm transition-shadow outline-none",
          error
            ? "border-red-300"
            : "border-[#d9dfe5] hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
        )}
      >
        <MapPin className="h-[22px] w-[22px] shrink-0 text-emerald-500" />
        <span className="min-w-0 flex-1">
          {selected ? (
            <span className={cn("block font-medium truncate", "text-[14px] text-slate-800")}>
              {selected}
            </span>
          ) : (
            <span className="block text-[16px] text-slate-400">Ünvanı xəritədən seçin</span>
          )}
          <span className="block text-[12px] text-slate-400">Konumunuzu seçin ·</span>
        </span>
        <span className="shrink-0 rounded-md bg-blue-50 px-3 py-1.5 text-[13px] font-semibold text-blue-600">
          Seç
        </span>
      </button>

      <input type="hidden" name={`${name}Lat`} value={position[0].toString()} />
      <input type="hidden" name={`${name}Lon`} value={position[1].toString()} />

      {error && (
        <span className="text-[12px] font-medium text-red-600 mt-1 block flex items-center gap-1">
          <i className="ri-error-warning-line"></i> {error}
        </span>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
                <MapPin className="h-5 w-5 text-emerald-500" />
                Ünvanı xəritədən seçin
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
                aria-label="Bağla"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative h-[360px] w-full">
              <MapContainer
                center={position}
                zoom={AZ_ZOOM}
                className="h-full w-full"
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Recenter center={position} />
                <MapInitializer onLocated={handlePositionChange} />
                <Marker
                  position={position}
                  icon={markerIcon}
                  draggable
                  eventHandlers={{
                    dragend: (event) => {
                      const latlng = (event.target as L.Marker).getLatLng();
                      handlePositionChange(latlng.lat, latlng.lng);
                    },
                  }}
                />
                <ReverseLocator position={position} onResolve={setResolvedLabel} />
              </MapContainer>

              <button
                type="button"
                onClick={() => {
                  setLocateError("");
                  navigator.geolocation.getCurrentPosition(
                    (geo) => handlePositionChange(geo.coords.latitude, geo.coords.longitude),
                    () => setLocateError("Konumunuz alınamadı."),
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                  );
                }}
                className="absolute bottom-3 left-3 z-[500] flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 shadow-md transition-colors hover:bg-slate-50"
              >
                <LocateFixed className="h-4 w-4" />
                Konumumu bul
              </button>

              {loading ? (
                <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] mx-auto w-fit rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
                  Mövqe müəyyən edilir...
                </div>
              ) : null}

              {locateError ? (
                <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] mx-auto w-fit rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 shadow-sm">
                  {locateError}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
              <div className="min-w-0 flex-1">
                {resolvedLabel ? (
                  <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
                    <MapPin className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="truncate">{resolvedLabel}</span>
                  </span>
                ) : (
                  <span className="text-[13px] text-slate-400">
                    Markerı sürükləyərək mövqeyi dəqiqləşdirin.
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="shrink-0 rounded-lg bg-blue-600 px-5 py-2 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                Təsdiqlə
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}