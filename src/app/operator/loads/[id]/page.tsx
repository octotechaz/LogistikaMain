
import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { OperatorLoadActions } from "@/components/OperatorLoadActions";
import { StatusBadge } from "@/components/StatusBadge";
import { requireRole } from "@/lib/auth";
import {
  buildOperatorSmsMessage,
  buildOperatorWhatsappMessage,
  buildWhatsappLink,
  dispatcherMatchesLoad,
  driverMatchesLoad,
  formatPrice
} from "@/lib/operator-utils";
import { prisma } from "@/lib/prisma";

export default async function OperatorLoadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["OPERATOR", "ADMIN"]);
  const { id } = await params;
  const load = await prisma.load.findUnique({
    where: { id },
    include: {
      cargoOwner: true,
      assignedDriver: { include: { user: true } },
      assignedDispatcher: { include: { user: true } },
      contactAttempts: {
        include: {
          driver: { include: { user: true } },
          dispatcher: { include: { user: true } },
          operator: true
        },
        orderBy: { createdAt: "desc" },
        take: 8
      }
    }
  });

  if (!load) {
    notFound();
  }

  const [drivers, dispatchers] = await Promise.all([
    prisma.driverProfile.findMany({ include: { user: true }, orderBy: [{ activityScore: "desc" }, { createdAt: "desc" }] }),
    prisma.dispatcherProfile.findMany({ include: { user: true }, orderBy: [{ activityScore: "desc" }, { createdAt: "desc" }] })
  ]);
  const whatsappMessage = buildOperatorWhatsappMessage(load);
  const smsMessage = buildOperatorSmsMessage(load);
  const matchedDrivers = drivers.filter((driver) => driverMatchesLoad(driver, load)).map((driver) => ({
    id: driver.id,
    name: `${driver.user.firstName} ${driver.user.lastName}`,
    phone: driver.user.phone,
    whatsappPhone: driver.whatsappPhone,
    vehicleType: driver.vehicleType,
    capacityTons: driver.capacityTons,
    routes: driver.routes,
    activityScore: driver.activityScore,
    whatsappLink: buildWhatsappLink(driver.whatsappPhone, whatsappMessage)
  }));
  const matchedDispatchers = dispatchers.filter((dispatcher) => dispatcherMatchesLoad(dispatcher, load)).map((dispatcher) => ({
    id: dispatcher.id,
    name: `${dispatcher.user.firstName} ${dispatcher.user.lastName}`,
    phone: dispatcher.user.phone,
    whatsappPhone: dispatcher.whatsappPhone,
    companyName: dispatcher.companyName,
    vehicleCount: dispatcher.vehicleCount,
    vehicleTypes: dispatcher.vehicleTypes,
    routes: dispatcher.routes,
    activityScore: dispatcher.activityScore,
    whatsappLink: buildWhatsappLink(dispatcher.whatsappPhone, whatsappMessage)
  }));

  return (
    <DashboardLayout user={user} currentPath="/operator/loads">
      <div className="page-shell">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-logistics-orange">Operator yük detalı</p>
            <h1 className="text-3xl font-bold text-navy-900">{load.title}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {load.pickupCity} → {load.deliveryCity} · {load.weight} ton · {load.requiredVehicleType}
            </p>
          </div>
          <StatusBadge status={load.status} />
        </div>

        <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-navy-900">Yük məlumatları</h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              <p><strong>Yük:</strong> {load.title}</p>
              <p><strong>Yük tipi:</strong> {load.cargoType}</p>
              <p><strong>Çəki:</strong> {load.weight} ton</p>
              <p><strong>Təklif olunan qiymət:</strong> {formatPrice(load)} AZN</p>
              <p><strong>Götürülmə:</strong> {load.pickupAddress}</p>
              <p><strong>Çatdırılma:</strong> {load.deliveryAddress}</p>
              <p><strong>Tarix:</strong> {load.pickupDate.toISOString().slice(0, 10)} {load.pickupTime ?? ""}</p>
              <p><strong>Ehtimal olunan nəqliyyat növü:</strong> {load.requiredVehicleType}</p>
            </div>
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">{load.description}</p>
          </div>

          <aside className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-navy-900">Yük verən</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p><strong>Ad:</strong> {load.cargoOwner.firstName} {load.cargoOwner.lastName}</p>
              <p><strong>Telefon:</strong> {load.cargoOwner.phone}</p>
              <p><strong>Email:</strong> {load.cargoOwner.email}</p>
              <p><strong>Şirkət:</strong> {load.cargoOwner.companyName ?? "Yoxdur"}</p>
            </div>
          </aside>
        </section>

        <OperatorLoadActions
          loadId={load.id}
          currentStatus={load.status}
          operatorNote={load.operatorNote}
          whatsappMessage={whatsappMessage}
          smsMessage={smsMessage}
          drivers={matchedDrivers}
          dispatchers={matchedDispatchers}
        />

        <section className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-navy-900">Son əlaqə cəhdləri</h2>
          {load.contactAttempts.length ? (
            <div className="mt-4 grid gap-3">
              {load.contactAttempts.map((attempt) => (
                <div key={attempt.id} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <p className="font-semibold text-navy-900">{attempt.channel} · {attempt.responseStatus ?? "Nəticə yoxdur"}</p>
                  <p className="mt-1">{attempt.driver ? `${attempt.driver.user.firstName} ${attempt.driver.user.lastName}` : attempt.dispatcher?.companyName ?? "Ümumi qeyd"}</p>
                  {attempt.note ? <p className="mt-1">{attempt.note}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">Hələ əlaqə cəhdi yazılmayıb.</p>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
