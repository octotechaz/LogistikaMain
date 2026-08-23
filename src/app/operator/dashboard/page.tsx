
import { LoadStatus } from "@prisma/client";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OperatorDashboardPage() {
  const user = await requireRole(["OPERATOR", "ADMIN"]);
  const [newLoads, waitingLoads, confirmedLoads, drivers, dispatchers, recentLoads] = await Promise.all([
    prisma.load.count({ where: { status: LoadStatus.NEW } }),
    prisma.load.count({ where: { status: { in: [LoadStatus.CONTACTING, LoadStatus.WAITING_RESPONSE, LoadStatus.PRICE_TOO_LOW, LoadStatus.NEGOTIATION] } } }),
    prisma.load.count({ where: { status: { in: [LoadStatus.CONFIRMED, LoadStatus.IN_PROGRESS, LoadStatus.COMPLETED] } } }),
    prisma.driverProfile.count({ where: { status: "ACTIVE", user: { status: "ACTIVE" } } }),
    prisma.dispatcherProfile.count({ where: { status: "ACTIVE", user: { status: "ACTIVE" } } }),
    prisma.load.findMany({
      include: { cargoOwner: true },
      orderBy: { createdAt: "desc" },
      take: 6
    })
  ]);

  return (
    <DashboardLayout user={user} currentPath="/operator/dashboard">
      <div className="page-shell">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-logistics-orange">Operator CRM</p>
            <h1 className="text-3xl font-bold text-navy-900">Yük uyğunlaşdırma paneli</h1>
            <p className="mt-2 text-sm text-slate-600">Yeni yükləri sürücü/dispetçerlərlə WhatsApp/SMS/zəng vasitəsilə bağlayın.</p>
          </div>
          <ButtonLink href="/operator/loads">Yüklərə keç</ButtonLink>
        </div>

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          <KpiCard label="Yeni yüklər" value={String(newLoads)} />
          <KpiCard label="Cavab gözləyir" value={String(waitingLoads)} />
          <KpiCard label="Bağlanan yüklər" value={String(confirmedLoads)} />
          <KpiCard label="Aktiv sürücülər" value={String(drivers)} />
          <KpiCard label="Aktiv dispetçerlər" value={String(dispatchers)} />
        </section>

        <section className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-navy-900">Son yüklər</h2>
            <ButtonLink href="/operator/loads" variant="secondary">
              Hamısına bax
            </ButtonLink>
          </div>
          <div className="grid gap-3">
            {recentLoads.map((load) => (
              <Link key={load.id} href={`/operator/loads/${load.id}`} className="rounded-lg border border-slate-200 p-4 transition hover:border-logistics-orange">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-navy-900">{load.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {load.pickupCity} → {load.deliveryCity} · {load.weight} ton · {load.requiredVehicleType}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Yük verən: {load.cargoOwner.firstName} {load.cargoOwner.lastName}</p>
                  </div>
                  <StatusBadge status={load.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
