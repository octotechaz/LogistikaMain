import Link from "next/link";
import { CalendarDays, MapPin, Scale, Truck } from "lucide-react";
import type { MockLoad } from "@/lib/mock-loads";
import { StatusBadge } from "@/components/StatusBadge";

export function LoadCard({ load }: { load: MockLoad }) {
  return (
    <article className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-navy-900">{load.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{load.cargoType}</p>
        </div>
        <StatusBadge status={load.status} />
      </div>
      <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <span className="inline-flex items-center gap-2">
          <MapPin className="h-4 w-4 text-logistics-orange" aria-hidden />
          {load.route}
        </span>
        <span className="inline-flex items-center gap-2">
          <Scale className="h-4 w-4 text-logistics-orange" aria-hidden />
          {load.tonnage} ton
        </span>
        <span className="inline-flex items-center gap-2">
          <Truck className="h-4 w-4 text-logistics-orange" aria-hidden />
          {load.requiredVehicleType}
        </span>
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-logistics-orange" aria-hidden />
          {load.date}
        </span>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <strong className="text-navy-900">{load.price}</strong>
        <Link href="/login" className="rounded-lg bg-logistics-orange px-4 py-2 text-sm font-semibold text-white">
          Müraciət üçün daxil ol
        </Link>
      </div>
    </article>
  );
}
