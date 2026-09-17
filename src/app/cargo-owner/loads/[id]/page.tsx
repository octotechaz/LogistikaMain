
import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { requireRole } from "@/lib/auth";
import {
  formatDimensions,
  formatQuantity,
  formatVolume,
  resolveVolumeValue
} from "@/lib/cargo-measurements";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/operator-utils";

export default async function CargoOwnerLoadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["CARGO_OWNER"]);
  const { id } = await params;
  const load = await prisma.load.findFirst({
    where: { id, cargoOwnerId: user.id },
    include: {
      assignedDriver: { include: { user: true } },
      assignedDispatcher: { include: { user: true } },
      contactAttempts: { orderBy: { createdAt: "desc" }, take: 5 }
    }
  });

  if (!load) {
    notFound();
  }

  const quantityLabel = formatQuantity(load.quantity);
  const dimensionsLabel = formatDimensions(load.length, load.width, load.height);
  const volumeValue = resolveVolumeValue(load.volume, load.length, load.width, load.height);
  const volumeLabel = volumeValue !== null ? `${formatVolume(volumeValue)} m³` : "";

  return (
    <DashboardLayout user={user} currentPath="/cargo-owner/loads">
      <div className="page-shell">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-logistics-orange">Yük statusu</p>
            <h1 className="text-3xl font-bold text-navy-900">{load.title}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {load.pickupCity} → {load.deliveryCity} · {load.weight} ton · {load.requiredVehicleType}
            </p>
          </div>
          <StatusBadge status={load.status} />
        </div>

        <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-navy-900">Yük məlumatları</h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              <p><strong>Yük tipi:</strong> {load.cargoType}</p>
              <p><strong>Təklif olunan qiymət:</strong> {formatPrice(load)} AZN</p>
              <p><strong>Götürülmə:</strong> {load.pickupAddress}</p>
              <p><strong>Çatdırılma:</strong> {load.deliveryAddress}</p>
              <p><strong>Tarix:</strong> {load.pickupDate.toISOString().slice(0, 10)} {load.pickupTime ?? ""}</p>
              <p><strong>Əlaqə:</strong> {load.contactPhone}</p>
              {quantityLabel ? <p><strong>Say:</strong> {quantityLabel}</p> : null}
              {volumeLabel ? <p><strong>Həcm:</strong> {volumeLabel}</p> : null}
              {dimensionsLabel ? <p className="md:col-span-2"><strong>Ölçülər:</strong> {dimensionsLabel}</p> : null}
            </div>
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">{load.description}</p>
            {load.operatorNote ? (
              <div className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
                <strong>Operator qeydi:</strong> {load.operatorNote}
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-navy-900">Təyinat</h2>
              <p className="mt-2 text-sm text-slate-600">
                Sürücü: {load.assignedDriver ? `${load.assignedDriver.user.firstName} ${load.assignedDriver.user.lastName}` : "Hələ təyin edilməyib"}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Dispetçer: {load.assignedDispatcher ? load.assignedDispatcher.companyName : "Hələ təyin edilməyib"}
              </p>
            </div>
            <ButtonLink href="/cargo-owner/loads" variant="secondary" className="w-full">
              Yüklərə qayıt
            </ButtonLink>
          </aside>
        </section>
      </div>
    </DashboardLayout>
  );
}
