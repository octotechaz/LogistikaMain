import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Package, Scale, Truck } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import {
  formatDimensions,
  formatQuantity,
  formatVolume,
  resolveVolumeValue
} from "@/lib/cargo-measurements";
import { formatCurrency, formatDate } from "@/lib/utils";

type CargoCardProps = {
  cargo: {
    id: string;
    cargoName: string;
    cargoType: string;
    weight: number;
    volume?: number | string | null;
    length?: number | string | null;
    width?: number | string | null;
    height?: number | string | null;
    quantity?: string | null;
    pickupCity: string;
    deliveryCity: string;
    pickupDate: Date | string;
    pickupDeadlineDate?: Date | string | null;
    requiredVehicleType: string;
    proposedPrice?: number | string | { toString(): string } | null;
    priceNegotiable?: boolean;
    status: string;
  };
  href?: string;
  actionLabel?: string;
};

export function CargoCard({ cargo, href, actionLabel = "Ətraflı bax" }: CargoCardProps) {
  const quantityLabel = formatQuantity(cargo.quantity);
  const dimensionsLabel = formatDimensions(cargo.length, cargo.width, cargo.height);
  const volumeValue = resolveVolumeValue(cargo.volume, cargo.length, cargo.width, cargo.height);
  const volumeLabel = volumeValue !== null ? `${formatVolume(volumeValue)} m³` : "";

  return (
    <article className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm transition hover:border-logistics-orange/60 hover:shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
            <Package className="h-4 w-4 text-logistics-orange" aria-hidden />
            {cargo.cargoType}
          </div>
          <h3 className="text-lg font-bold text-navy-900">{cargo.cargoName}</h3>
        </div>
        <StatusBadge status={cargo.status} />
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <span className="inline-flex items-center gap-2">
          <MapPin className="h-4 w-4 text-navy-500" aria-hidden />
          {cargo.pickupCity} → {cargo.deliveryCity}
        </span>
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-navy-500" aria-hidden />
          {formatDate(cargo.pickupDeadlineDate ?? cargo.pickupDate)}
        </span>
        <span className="inline-flex items-center gap-2">
          <Scale className="h-4 w-4 text-navy-500" aria-hidden />
          {cargo.weight} ton
        </span>
        <span className="inline-flex items-center gap-2">
          <Truck className="h-4 w-4 text-navy-500" aria-hidden />
          {cargo.requiredVehicleType}
        </span>
        {quantityLabel ? <span><strong>Say:</strong> {quantityLabel}</span> : null}
        {volumeLabel ? <span><strong>Həcm:</strong> {volumeLabel}</span> : null}
        {dimensionsLabel ? <span className="sm:col-span-2"><strong>Ölçülər:</strong> {dimensionsLabel}</span> : null}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <strong className="text-lg text-navy-900">
          {cargo.priceNegotiable ? "Razılaşma ilə" : formatCurrency(cargo.proposedPrice)}
        </strong>
        {href ? (
          <Link href={href} className="inline-flex items-center gap-2 text-sm font-semibold text-logistics-orange">
            {actionLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
