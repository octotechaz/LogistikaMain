"use client";

import { useEffect, useRef } from "react";
import { azerbaijanMapLocations, type AzerbaijanMapLocation } from "@/lib/azerbaijan-map-locations";

interface RouteMapProps {
  fromCity?: string;
  fromAddress?: string;
  toCity?: string;
  toAddress?: string;
}

function normalizeLabel(value: string) {
  return value
    .toLocaleLowerCase("az")
    .replace(/[ı]/g, "i")
    .trim();
}

function findLocation(value?: string): AzerbaijanMapLocation | null {
  if (!value) return null;
  const needle = normalizeLabel(value);

  // Exact match first
  const exact = azerbaijanMapLocations.find(
    (loc) => normalizeLabel(loc.label) === needle
  );
  if (exact) return exact;

  // Partial match — city name embedded in a longer string e.g. "Bakı, Nərimanov r."
  const partial = azerbaijanMapLocations.find(
    (loc) => needle.includes(normalizeLabel(loc.label))
  );
  return partial || null;
}

export default function RouteMap({ fromCity, fromAddress, toCity, toAddress }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    const from = findLocation(fromCity) || findLocation(fromAddress);
    const to = findLocation(toCity) || findLocation(toAddress);

    if (!from && !to) return;

    // Dynamically import Leaflet to avoid SSR issues
    import("leaflet").then((L) => {
      if (!containerRef.current) return;

      // Destroy previous map instance if exists
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }

      // Fix default icon paths for Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Determine map center and zoom
      let center: [number, number];
      let zoom = 8;

      if (from && to) {
        center = [
          (from.latitude + to.latitude) / 2,
          (from.longitude + to.longitude) / 2,
        ];
      } else if (from) {
        center = [from.latitude, from.longitude];
        zoom = 10;
      } else {
        center = [to!.latitude, to!.longitude];
        zoom = 10;
      }

      const map = L.map(containerRef.current, {
        center,
        zoom,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      mapRef.current = map;

      // OpenStreetMap tiles — no API key needed, always works
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // From marker (green)
      if (from) {
        const greenIcon = L.icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });
        const fromLabel = fromAddress ? `${from.label}\n${fromAddress}` : from.label;
        L.marker([from.latitude, from.longitude], { icon: greenIcon })
          .addTo(map)
          .bindPopup(`<b>Götürülmə:</b><br>${fromLabel.replace(/\n/g, "<br>")}`)
          .openPopup();
      }

      // To marker (red)
      if (to) {
        const redIcon = L.icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });
        const toLabel = toAddress ? `${to.label}\n${toAddress}` : to.label;
        L.marker([to.latitude, to.longitude], { icon: redIcon })
          .addTo(map)
          .bindPopup(`<b>Çatdırılma:</b><br>${toLabel.replace(/\n/g, "<br>")}`);
      }

      // Draw a line between the two points
      if (from && to) {
        L.polyline(
          [[from.latitude, from.longitude], [to.latitude, to.longitude]],
          { color: "#f97316", weight: 3, dashArray: "6, 6", opacity: 0.8 }
        ).addTo(map);

        // Fit map to show both markers
        map.fitBounds([
          [from.latitude, from.longitude],
          [to.latitude, to.longitude],
        ], { padding: [40, 40] });
      }
    }).catch(() => {
      // Leaflet failed to load — silently ignore, fallback UI will show
    });

    return () => {
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  }, [fromCity, fromAddress, toCity, toAddress]);

  const from = findLocation(fromCity) || findLocation(fromAddress);
  const to = findLocation(toCity) || findLocation(toAddress);

  // No recognizable location at all — show neutral message, no crash
  if (!from && !to) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
        <span className="text-sm font-medium text-slate-500">Xəritə məlumatı tapılmadı</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 text-xs text-slate-500">
        {from && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
            Götürülmə: <strong className="text-slate-700">{fromCity || from.label}</strong>
          </span>
        )}
        {to && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
            Çatdırılma: <strong className="text-slate-700">{toCity || to.label}</strong>
          </span>
        )}
      </div>
      <div ref={containerRef} style={{ height: "320px", width: "100%" }} />
    </div>
  );
}