
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OperatorDispatchersPage() {
  const user = await requireRole(["OPERATOR", "ADMIN"]);
  const dispatchers = await prisma.dispatcherProfile.findMany({
    include: { user: true },
    orderBy: [{ activityScore: "desc" }, { createdAt: "desc" }]
  });

  return (
    <DashboardLayout user={user} currentPath="/operator/dispatchers">
      <div className="page-shell">
        <div>
          <p className="text-sm font-semibold text-logistics-orange">Operator CRM</p>
          <h1 className="text-3xl font-bold text-navy-900">Dispetçerlər</h1>
        </div>
        {dispatchers.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dispatchers.map((dispatcher) => (
              <article key={dispatcher.id} className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-navy-900">{dispatcher.companyName}</h2>
                    <p className="mt-1 text-sm text-slate-600">{dispatcher.vehicleCount} maşın · {dispatcher.vehicleTypes.join(", ")}</p>
                  </div>
                  <StatusBadge status={dispatcher.status} />
                </div>
                <div className="mt-4 space-y-1 text-sm text-slate-600">
                  <p>Əlaqə: {dispatcher.user.firstName} {dispatcher.user.lastName}</p>
                  <p>Telefon: {dispatcher.user.phone}</p>
                  <p>WhatsApp: {dispatcher.whatsappPhone}</p>
                  <p>İstiqamətlər: {dispatcher.routes.join(", ")}</p>
                  <p className="font-semibold text-logistics-orange">Aktivlik balı: {dispatcher.activityScore}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Dispetçer yoxdur" description="Dispetçerlər qeydiyyatdan keçdikcə burada görünəcək." />
        )}
      </div>
    </DashboardLayout>
  );
}
