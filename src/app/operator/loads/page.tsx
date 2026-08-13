
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireRole } from "@/lib/auth";
import { formatPrice } from "@/lib/operator-utils";
import { prisma } from "@/lib/prisma";

export default async function OperatorLoadsPage() {
  const user = await requireRole(["OPERATOR", "ADMIN"]);
  const loads = await prisma.load.findMany({
    include: {
      cargoOwner: true,
      assignedDriver: { include: { user: true } },
      assignedDispatcher: { include: { user: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <DashboardLayout user={user} currentPath="/operator/loads">
      <div className="page-shell">
        <div>
          <p className="text-sm font-semibold text-logistics-orange">Operator CRM</p>
          <h1 className="text-3xl font-bold text-navy-900">Yüklər</h1>
          <p className="mt-2 text-sm text-slate-600">Yükləri açın, uyğun sürücü/dispetçerləri görün və əlaqə nəticələrini yazın.</p>
        </div>

        {loads.length ? (
          <div className="grid gap-4">
            {loads.map((load) => (
              <Link key={load.id} href={`/operator/loads/${load.id}`} className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm transition hover:border-logistics-orange">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-navy-900">{load.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {load.pickupCity} → {load.deliveryCity} · {load.weight} ton · {load.requiredVehicleType}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Yük verən: {load.cargoOwner.firstName} {load.cargoOwner.lastName} · Təklif olunan qiymət: {formatPrice(load)} AZN
                    </p>
                  </div>
                  <StatusBadge status={load.status} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Yük tapılmadı" description="Yük verənlər yük yerləşdirəndə bu siyahıda görünəcək." />
        )}
      </div>
    </DashboardLayout>
  );
}
