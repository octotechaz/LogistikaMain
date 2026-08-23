import { Gauge, MapPin, Phone, Ruler, Truck } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";

type VehicleCardProps = {
  vehicle: {
    id: string;
    vehicleType: string;
    brand: string;
    model: string;
    plateNumber: string;
    driverFirstName: string;
    driverLastName: string;
    driverPhone: string;
    capacityTons: number;
    overallDimensions: string;
    serviceAreas: string[];
    status: string;
  };
  editHref?: string;
};

export function VehicleCard({ vehicle, editHref }: VehicleCardProps) {
  return (
    <article className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy-900 text-white">
            <Truck className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h3 className="text-lg font-bold text-navy-900">
              {vehicle.brand} {vehicle.model}
            </h3>
            <p className="text-sm text-slate-500">
              {vehicle.vehicleType} · {vehicle.plateNumber}
            </p>
          </div>
        </div>
        <StatusBadge status={vehicle.status} />
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <span className="inline-flex items-center gap-2">
          <Gauge className="h-4 w-4 text-logistics-orange" aria-hidden />
          {vehicle.capacityTons} ton
        </span>
        <span className="inline-flex items-center gap-2">
          <Ruler className="h-4 w-4 text-logistics-orange" aria-hidden />
          {vehicle.overallDimensions}
        </span>
        <span className="inline-flex items-center gap-2">
          <Phone className="h-4 w-4 text-logistics-orange" aria-hidden />
          {vehicle.driverFirstName} {vehicle.driverLastName} · {vehicle.driverPhone}
        </span>
        <span className="inline-flex items-center gap-2">
          <MapPin className="h-4 w-4 text-logistics-orange" aria-hidden />
          {vehicle.serviceAreas.join(", ")}
        </span>
      </div>

      {editHref ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <Link href={editHref} className="text-sm font-semibold text-logistics-orange">
            Redaktə et
          </Link>
        </div>
      ) : null}
    </article>
  );
}
