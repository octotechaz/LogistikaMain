
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OperatorDriversPage() {
  const user = await requireRole(["OPERATOR", "ADMIN"]);
  const drivers = await prisma.driverProfile.findMany({
    include: { user: true },
    orderBy: [{ activityScore: "desc" }, { createdAt: "desc" }]
  });

  return (
    <DashboardLayout user={user} currentPath="/operator/drivers">
      <div className="page-shell">
        <div>
          <p className="text-sm font-semibold text-logistics-orange">Operator CRM</p>
          <h1 className="text-3xl font-bold text-navy-900">Sürücülər</h1>
        </div>
        {drivers.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {drivers.map((driver) => (
              <article key={driver.id} className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-navy-900">{driver.user.firstName} {driver.user.lastName}</h2>
                    <p className="mt-1 text-sm text-slate-600">{driver.vehicleType} · {driver.capacityTons} ton</p>
                  </div>
                  <StatusBadge status={driver.status} />
                </div>
                <div className="mt-4 space-y-1 text-sm text-slate-600">
                  <p>Telefon: {driver.user.phone}</p>
                  <p>WhatsApp: {driver.whatsappPhone}</p>
                  <p>İstiqamətlər: {driver.routes.join(", ")}</p>
                  <p className="font-semibold text-logistics-orange">Aktivlik balı: {driver.activityScore}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Sürücü yoxdur" description="Sürücülər qeydiyyatdan keçdikcə burada görünəcək." />
        )}
      </div>
    </DashboardLayout>
  );
}
