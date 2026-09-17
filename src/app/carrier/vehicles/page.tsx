
import { VehicleCard } from "@/components/VehicleCard";
import {
  EmptyAccessState,
  MetricCard,
  PageSection
} from "@/components/classifieds/shared";
import { ButtonLink } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { CheckCircle2, Clock3, Truck, XCircle } from "lucide-react";

export default async function CarrierVehiclesPage() {
  const user = await requireRole(["CARRIER", "ADMIN"]);
  const carrierWhere = user.role === "CARRIER" ? { carrierId: user.id } : undefined;

  const vehicles = await prisma.vehicle.findMany({
    where: carrierWhere,
    orderBy: { createdAt: "desc" }
  });

  const approved = vehicles.filter((item) => item.status === "APPROVED").length;
  const pending = vehicles.filter((item) => item.status === "PENDING").length;
  const rejected = vehicles.filter((item) => item.status === "REJECTED").length;

  return (
    <>
      <PageSection
        title="Mənim avtomobillərim"
        description="Avtomobil əlavə edin, statusunu izləyin və müraciətlərdə istifadə edin."
        action={<ButtonLink href="/carrier/vehicles/new">Yeni avtomobil</ButtonLink>}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Cəmi" value={String(vehicles.length)} icon={<Truck className="h-5 w-5" />} />
        <MetricCard label="Təsdiqlənib" value={String(approved)} icon={<CheckCircle2 className="h-5 w-5" />} />
        <MetricCard label="Gözləyir" value={String(pending)} icon={<Clock3 className="h-5 w-5" />} />
        <MetricCard label="Rədd edilib" value={String(rejected)} icon={<XCircle className="h-5 w-5" />} />
      </div>

      {vehicles.length ? (
        <div className="grid gap-4">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} editHref={`/carrier/vehicles/${vehicle.id}/edit`} />
          ))}
        </div>
      ) : (
        <EmptyAccessState
          title="Hələ avtomobil əlavə etməmisiniz"
          description="Yük təkliflərinə müraciət etmək üçün avtomobil məlumatlarınızı əlavə edin."
          actionHref="/carrier/vehicles/new"
          actionLabel="Avtomobil əlavə et"
        />
      )}
    </>
  );
}
