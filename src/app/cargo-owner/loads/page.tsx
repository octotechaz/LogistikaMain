
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CargoOwnerLoadsPage() {
  const user = await requireRole(["CARGO_OWNER"]);
  const loads = await prisma.load.findMany({
    where: { cargoOwnerId: user.id },
    orderBy: { createdAt: "desc" }
  });

  return (
    <DashboardLayout user={user} currentPath="/cargo-owner/loads">
      <div className="page-shell">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-logistics-orange">Yüklərim</p>
            <h1 className="text-3xl font-bold text-navy-900">Yerləşdirdiyiniz yüklər</h1>
          </div>
          <ButtonLink href="/cargo-owner/loads/new">Yeni yük yerləşdir</ButtonLink>
        </div>

        {loads.length ? (
          <div className="grid gap-4">
            {loads.map((load) => (
              <Link key={load.id} href={`/cargo-owner/loads/${load.id}`} className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm transition hover:border-logistics-orange">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-navy-900">{load.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {load.pickupCity} → {load.deliveryCity} · {load.weight} ton · {load.requiredVehicleType}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">Operator statusunu və qeydləri detal səhifədə izləyə bilərsiniz.</p>
                  </div>
                  <StatusBadge status={load.status} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Hələ yük yerləşdirilməyib" description="Yükünüzü daxil edin, operatorlar uyğun sürücü/dispetçer axtarışına başlasın." actionHref="/cargo-owner/loads/new" actionLabel="Yeni yük yerləşdir" />
        )}
      </div>
    </DashboardLayout>
  );
}
