
import {
  ClipboardList,
  Clock3,
  MapPin,
  MessageCircle,
  Package,
  Scale,
  ShieldCheck,
  Truck
} from "lucide-react";
import {
  EmptyAccessState,
  MetricCard,
  PageSection
} from "@/components/classifieds/shared";
import { StatusBadge } from "@/components/StatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { activeCargoPostWhere } from "@/lib/cargo-post-expiration";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";

function formatNumber(value: number | null | undefined, unit: string) {
  if (value === null || value === undefined) {
    return "Qeyd edilməyib";
  }

  return `${Number(value.toFixed(2)).toString()} ${unit}`;
}

export default async function CarrierDashboardPage() {
  const user = await requireRole(["CARRIER", "ADMIN"]);
  const carrierWhere = user.role === "CARRIER" ? { carrierId: user.id } : undefined;

  const [
    vehicles,
    approvedVehicles,
    pendingVehicles,
    applications,
    pendingApplications,
    acceptedApplications,
    activeCargoPosts,
    recentLoads,
    recentApplications,
    recentVehicles
  ] = await Promise.all([
    prisma.vehicle.count({ where: carrierWhere }),
    prisma.vehicle.count({ where: { ...carrierWhere, status: "APPROVED" } }),
    prisma.vehicle.count({ where: { ...carrierWhere, status: "PENDING" } }),
    prisma.cargoApplication.count({ where: carrierWhere }),
    prisma.cargoApplication.count({ where: { ...carrierWhere, status: "PENDING" } }),
    prisma.cargoApplication.count({ where: { ...carrierWhere, status: "ACCEPTED" } }),
    prisma.cargoPost.count({ where: activeCargoPostWhere() }),
    prisma.cargoPost.findMany({
      where: activeCargoPostWhere(),
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        cargoName: true,
        cargoType: true,
        weight: true,
        pickupCity: true,
        deliveryCity: true,
        pickupDeadlineDate: true,
        pickupDate: true,
        requiredVehicleType: true,
        proposedPrice: true,
        priceNegotiable: true,
        status: true
      }
    }),
    prisma.cargoApplication.findMany({
      where: carrierWhere,
      include: {
        cargoPost: {
          select: {
            cargoName: true,
            pickupCity: true,
            deliveryCity: true
          }
        },
        vehicle: {
          select: {
            brand: true,
            model: true,
            plateNumber: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.vehicle.findMany({
      where: carrierWhere,
      orderBy: { createdAt: "desc" },
      take: 4
    })
  ]);

  const profile = user.carrierProfile;
  const needsApprovedVehicle = approvedVehicles === 0;

  return (
    <>
      <PageSection
        title={`Xoş gəldiniz, ${user.firstName}`}
        description="Aktiv yükləri izləyin, müraciət edin və avtomobil parkınızı idarə edin."
        action={
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/carrier/cargo-posts">Aktiv yüklərə bax</ButtonLink>
            <ButtonLink href="/carrier/vehicles/new" variant="secondary">
              Avtomobil əlavə et
            </ButtonLink>
          </div>
        }
      />
      {needsApprovedVehicle ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Müraciət etmək üçün ən azı bir <strong>təsdiqlənmiş</strong> avtomobil lazımdır.
          {pendingVehicles > 0
            ? ` Hazırda ${pendingVehicles} avtomobil admin təsdiqi gözləyir.`
            : " İndi avtomobil əlavə edib təsdiqə göndərin."}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Təsdiqli avtomobil" value={String(approvedVehicles)} icon={<Truck className="h-5 w-5" />} />
        <MetricCard label="Aktiv yük elanları" value={String(activeCargoPosts)} icon={<Package className="h-5 w-5" />} />
        <MetricCard
          label="Gözləyən müraciət"
          value={String(pendingApplications)}
          icon={<Clock3 className="h-5 w-5" />}
        />
        <MetricCard
          label="Qəbul edilən"
          value={String(acceptedApplications)}
          icon={<ShieldCheck className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-navy-900">Son aktiv yüklər</h2>
              <p className="mt-1 text-sm text-slate-500">Təsdiqlənmiş və hələ açıq olan elanlar</p>
            </div>
            <ButtonLink href="/carrier/cargo-posts" variant="secondary" className="h-9 px-3 text-sm">
              Hamısına bax
            </ButtonLink>
          </div>

          {recentLoads.length ? (
            <div className="divide-y divide-slate-100">
              {recentLoads.map((load) => (
                <div key={load.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[15px] font-semibold text-navy-900">{load.cargoName}</h3>
                      <StatusBadge status="ACTIVE" />
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-logistics-orange" />
                      {load.pickupCity} → {load.deliveryCity}
                      <span className="text-slate-300">•</span>
                      {load.weight} ton
                      <span className="text-slate-300">•</span>
                      {load.requiredVehicleType}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Son tarix: {formatDate(load.pickupDeadlineDate ?? load.pickupDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-bold text-navy-900">
                      {load.priceNegotiable ? "Razılaşma ilə" : formatCurrency(load.proposedPrice)}
                    </span>
                    <ButtonLink href="/carrier/cargo-posts" variant="secondary" className="h-9 px-3 text-sm">
                      Müraciət et
                    </ButtonLink>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyAccessState
                title="Aktiv yük yoxdur"
                description="Admin təsdiqli yeni elanlar buraya düşəcək."
                actionHref="/carrier/cargo-posts"
                actionLabel="Yüklərə bax"
              />
            </div>
          )}
        </section>

        <section className="surface-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-logistics-orange">Profil xülasəsi</p>
              <h2 className="mt-1 text-lg font-bold text-navy-900">Daşıma imkanlarınız</h2>
            </div>
            <Truck className="h-5 w-5 text-logistics-orange" />
          </div>

          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <Truck className="mt-0.5 h-4 w-4 text-logistics-orange" />
              <div>
                <p className="font-semibold text-navy-900">{profile?.vehicleType || "Nəqliyyat növü qeyd edilməyib"}</p>
                <p className="mt-1">Əsas avtomobil növü</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-slate-500">
                  <Package className="h-4 w-4 text-logistics-orange" />
                  Yük yeri həcmi
                </div>
                <p className="mt-2 font-semibold text-navy-900">{formatNumber(profile?.cargoSpaceVolumeM3, "m³")}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-slate-500">
                  <Scale className="h-4 w-4 text-logistics-orange" />
                  Maksimal çəki
                </div>
                <p className="mt-2 font-semibold text-navy-900">{formatNumber(profile?.maxWeightTons, "ton")}</p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 text-slate-500">
                <MessageCircle className="h-4 w-4 text-logistics-orange" />
                WhatsApp
              </div>
              <p className="mt-2 font-semibold text-navy-900">{profile?.whatsappPhone || user.phone || "Qeyd edilməyib"}</p>
            </div>

            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 text-slate-500">
                <MapPin className="h-4 w-4 text-logistics-orange" />
                Yerləşmə
              </div>
              <p className="mt-2 font-semibold text-navy-900">
                {profile?.locationAddress || profile?.locationLabel || "Qeyd edilməyib"}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-slate-500">Daşıya bildiyiniz yük növləri</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile?.supportedCargoTypes?.length ? (
                  profile.supportedCargoTypes.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Hələ qeyd edilməyib</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            <ButtonLink href="/carrier/vehicles" variant="secondary" className="w-full justify-center">
              Avtomobilləri idarə et ({vehicles})
            </ButtonLink>
            <ButtonLink href="/carrier/applications" variant="secondary" className="w-full justify-center">
              Müraciətləri izlə ({applications})
            </ButtonLink>
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-bold text-navy-900">Son müraciətlər</h2>
            <ButtonLink href="/carrier/applications" variant="ghost" className="h-9 px-3 text-sm">
              Hamısı
            </ButtonLink>
          </div>
          {recentApplications.length ? (
            <div className="divide-y divide-slate-100">
              {recentApplications.map((application) => (
                <div key={application.id} className="flex items-start justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy-900">
                      {application.cargoPost?.cargoName || "Yük elanı"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {application.cargoPost
                        ? `${application.cargoPost.pickupCity} → ${application.cargoPost.deliveryCity}`
                        : "Marşrut yoxdur"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(application.createdAt)}</p>
                  </div>
                  <StatusBadge status={application.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 text-sm text-slate-500">Hələ müraciət göndərməmisiniz.</div>
          )}
        </section>

        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-bold text-navy-900">Avtomobillərim</h2>
            <ButtonLink href="/carrier/vehicles/new" variant="ghost" className="h-9 px-3 text-sm">
              Əlavə et
            </ButtonLink>
          </div>
          {recentVehicles.length ? (
            <div className="divide-y divide-slate-100">
              {recentVehicles.map((vehicle) => (
                <div key={vehicle.id} className="flex items-start justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy-900">
                      {vehicle.brand} {vehicle.model}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {vehicle.vehicleType} · {vehicle.plateNumber} · {vehicle.capacityTons} ton
                    </p>
                  </div>
                  <StatusBadge status={vehicle.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyAccessState
                title="Avtomobil yoxdur"
                description="Yüklərə müraciət etmək üçün əvvəl avtomobil əlavə edin."
                actionHref="/carrier/vehicles/new"
                actionLabel="Avtomobil əlavə et"
              />
            </div>
          )}
        </section>
      </div>

      <section className="surface-panel p-5">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-logistics-orange" />
          <h2 className="text-lg font-bold text-navy-900">Tez əməliyyatlar</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <ButtonLink href="/carrier/vehicles/new" variant="secondary" className="justify-center">
            Avtomobil əlavə et
          </ButtonLink>
          <ButtonLink href="/carrier/cargo-posts" variant="secondary" className="justify-center">
            Aktiv yüklərə bax
          </ButtonLink>
          <ButtonLink href="/carrier/applications" variant="secondary" className="justify-center">
            Müraciətləri izlə
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
