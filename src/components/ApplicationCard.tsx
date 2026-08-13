import { MessageSquareText, Truck } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";

type ApplicationCardProps = {
  application: {
    id: string;
    status: string;
    message?: string | null;
    offeredPrice?: number | string | { toString(): string } | null;
    createdAt: Date | string;
    cargoPost?: {
      cargoName: string;
      pickupCity: string;
      deliveryCity: string;
    };
    vehicle?: {
      brand: string;
      model: string;
      plateNumber: string;
    };
    carrierProfile?: {
      user: {
        firstName: string;
        lastName: string;
        phone: string;
      };
    };
  };
  decisionActions?: boolean;
};

export function ApplicationCard({ application, decisionActions = false }: ApplicationCardProps) {
  return (
    <article className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-navy-900">
            {application.cargoPost?.cargoName ??
              `${application.carrierProfile?.user.firstName} ${application.carrierProfile?.user.lastName}`}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{formatDate(application.createdAt)}</p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
        {application.cargoPost ? (
          <span>
            Marşrut: {application.cargoPost.pickupCity} → {application.cargoPost.deliveryCity}
          </span>
        ) : null}
        {application.vehicle ? (
          <span className="inline-flex items-center gap-2">
            <Truck className="h-4 w-4 text-logistics-orange" aria-hidden />
            {application.vehicle.brand} {application.vehicle.model} · {application.vehicle.plateNumber}
          </span>
        ) : null}
        {application.carrierProfile ? (
          <span>
            Daşıyıcı: {application.carrierProfile.user.firstName} {application.carrierProfile.user.lastName} ·{" "}
            {application.carrierProfile.user.phone}
          </span>
        ) : null}
        <span>Təklif: {formatCurrency(application.offeredPrice)}</span>
      </div>

      {application.message ? (
        <p className="mt-4 flex gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-logistics-orange" aria-hidden />
          {application.message}
        </p>
      ) : null}

      {decisionActions && application.status === "PENDING" ? (
        <form className="mt-5 flex gap-3" action={`/api/applications/${application.id}`} method="post">
          <button
            name="status"
            value="ACCEPTED"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Qəbul et
          </button>
          <button
            name="status"
            value="REJECTED"
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
          >
            Rədd et
          </button>
        </form>
      ) : null}
    </article>
  );
}
