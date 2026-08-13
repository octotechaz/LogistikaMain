"use client";

import { useEffect, useState } from "react";

interface RouteMapProps {
  fromCity?: string;
  fromAddress?: string;
  toCity?: string;
  toAddress?: string;
}

export default function RouteMap({ fromCity, fromAddress, toCity, toAddress }: RouteMapProps) {
  const [loading, setLoading] = useState(true);

  // We build an embed URL for Google Maps directions using the standard iframe API
  const [mapUrl, setMapUrl] = useState("");

  useEffect(() => {
    // If we have both cities, draw a route
    if (fromCity && toCity) {
      const origin = encodeURIComponent(`${fromCity}, ${fromAddress ? fromAddress + ', ' : ''}Azerbaijan`);
      const dest = encodeURIComponent(`${toCity}, ${toAddress ? toAddress + ', ' : ''}Azerbaijan`);
      
      // Google Maps embedded directions URL (uses the free non-API-key embed if formatted like this, 
      // or we can use the regular Maps URL in an iframe)
      const url = `https://maps.google.com/maps?saddr=${origin}&daddr=${dest}&output=embed`;
      setMapUrl(url);
      setLoading(false);
    } else if (fromCity || toCity) {
      // Just show the one location we have
      const city = fromCity || toCity;
      const addr = fromAddress || toAddress;
      const q = encodeURIComponent(`${city}, ${addr ? addr + ', ' : ''}Azerbaijan`);
      
      const url = `https://maps.google.com/maps?q=${q}&output=embed`;
      setMapUrl(url);
      setLoading(false);
    } else {
      // No data provided
      setLoading(false);
    }
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
