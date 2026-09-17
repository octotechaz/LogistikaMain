"use client";

import { useEffect, useState } from "react";
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
  if (!value) {
    return null;
  }

  const needle = normalizeLabel(value);

  // Exact match first
  const exact = azerbaijanMapLocations.find(
    (location) => normalizeLabel(location.label) === needle
  );

  if (exact) {
    return exact;
  }

  // Partial / city name embedded in a longer string (e.g. "Bakı, Babək prospekti")
  const partial = azerbaijanMapLocations.find(
    (location) => needle.includes(normalizeLabel(location.label))
  );

  return partial || null;
}

export default function RouteMap({ fromCity, fromAddress, toCity, toAddress }: RouteMapProps) {
  const [loading, setLoading] = useState(true);
  const [mapUrl, setMapUrl] = useState("");

  useEffect(() => {
    const from = findLocation(fromCity);
    const to = findLocation(toCity);

    // Both endpoints known by coordinates -> draw route with markers
    if (from && to) {
      const origin = `${from.latitude},${from.longitude}`;
      const dest = `${to.latitude},${to.longitude}`;
      const url = `https://maps.google.com/maps?saddr=${origin}&daddr=${dest}&output=embed`;
      setMapUrl(url);
      setLoading(false);
      return;
    }

    // Try to build a route from address text
    if (fromCity && toCity) {
      const origin = encodeURIComponent(`${fromCity}, ${fromAddress ? fromAddress + ', ' : ''}Azerbaijan`);
      const dest = encodeURIComponent(`${toCity}, ${toAddress ? toAddress + ', ' : ''}Azerbaijan`);
      const url = `https://maps.google.com/maps?saddr=${origin}&daddr=${dest}&output=embed`;
      setMapUrl(url);
      setLoading(false);
      return;
    }

    // Single known location by coordinates
    if (from) {
      const q = `${from.latitude},${from.longitude}`;
      setMapUrl(`https://maps.google.com/maps?q=${q}&output=embed`);
      setLoading(false);
      return;
    }

    if (to) {
      const q = `${to.latitude},${to.longitude}`;
      setMapUrl(`https://maps.google.com/maps?q=${q}&output=embed`);
      setLoading(false);
      return;
    }

    // Fallback: single location by address text
    const city = fromCity || toCity;
    if (city) {
      const addr = fromAddress || toAddress;
      const q = encodeURIComponent(`${city}, ${addr ? addr + ', ' : ''}Azerbaijan`);
      setMapUrl(`https://maps.google.com/maps?q=${q}&output=embed`);
      setLoading(false);
      return;
    }

    // No data provided
    setLoading(false);
  }, [fromCity, fromAddress, toCity, toAddress]);

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center animate-pulse rounded-xl bg-slate-100">
        <span className="font-medium text-slate-400">Xəritə yüklənir...</span>
      </div>
    );
  }

  if (!mapUrl) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
        <span className="font-medium text-slate-500">Xəritə məlumatı tapılmadı</span>
      </div>
    );
  }

  return (
    <div className="relative z-0 h-80 w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 0 }}
        src={mapUrl}
        allowFullScreen
        title="Google Maps Route"
      ></iframe>
    </div>
  );
}