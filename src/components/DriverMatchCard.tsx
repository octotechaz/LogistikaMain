import { Phone, Star, Truck } from "lucide-react";
import type { MockDriver } from "@/lib/mock-drivers";

export function DriverMatchCard({ driver }: { driver: MockDriver }) {
  return (
    <article className="rounded-lg border border-navy-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-navy-900">{driver.name}</h4>
          <p className="mt-1 text-sm text-slate-500">{driver.city} · {driver.directions.join(", ")}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-logistics-orange">
          <Star className="h-3.5 w-3.5" aria-hidden />
          {driver.activityScore}
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <span className="inline-flex items-center gap-2">
          <Phone className="h-4 w-4 text-logistics-orange" aria-hidden />
          {driver.phone}
        </span>
        <span className="inline-flex items-center gap-2">
          <Truck className="h-4 w-4 text-logistics-orange" aria-hidden />
          {driver.vehicleType} · {driver.tonnage} ton
        </span>
      </div>
      <p className="mt-3 rounded-lg bg-slate-50 p-2 text-xs font-semibold text-slate-600">
        Son cavab: {driver.lastResponseStatus}
      </p>
    </article>
  );
}
