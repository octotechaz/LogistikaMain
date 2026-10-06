"use client";

interface RouteMapProps {
  fromCity?: string;
  fromAddress?: string;
  toCity?: string;
  toAddress?: string;
}

export default function RouteMap({ fromCity, fromAddress, toCity, toAddress }: RouteMapProps) {
  const origin = encodeURIComponent([fromAddress, fromCity].filter(Boolean).join(", ") || "");
  const destination = encodeURIComponent([toAddress, toCity].filter(Boolean).join(", ") || "");

  if (!origin && !destination) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-xl bg-slate-50">
        <span className="text-sm font-medium text-slate-500">Xəritə məlumatı tapılmadı</span>
      </div>
    );
  }

  const src = `https://maps.google.com/maps?saddr=${origin}&daddr=${destination}&hl=az&output=embed&t=m`;

  return (
    <div className="w-full overflow-hidden rounded-xl" style={{ height: 360 }}>
      <iframe
        title="Marşrut xəritəsi"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={src}
      />
    </div>
  );
}
