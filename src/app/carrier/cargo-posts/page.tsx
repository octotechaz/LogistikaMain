
import { CargoApplyForm } from "@/components/CargoApplyForm";
import { CargoCard } from "@/components/CargoCard";
import { FilterPanel } from "@/components/FilterPanel";
import {
  EmptyAccessState,
  PageSection
} from "@/components/classifieds/shared";
import { activeCargoPostWhere } from "@/lib/cargo-post-expiration";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ButtonLink } from "@/components/ui/Button";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numberFilter(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? undefined : numberValue;
}

export default async function CarrierCargoPostsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole(["CARRIER", "ADMIN"]);
  const params = await searchParams;
  const filters = {
    cargoType: single(params.cargoType),
    city: single(params.city),
    vehicleType: single(params.vehicleType),
    date: single(params.date),
    tonnage: single(params.tonnage),
    priceMin: single(params.priceMin),
    priceMax: single(params.priceMax),
    q: single(params.q)
  };
  const pickupDate = filters.date ? new Date(filters.date) : undefined;
  const pickupDateEnd = pickupDate ? new Date(pickupDate) : undefined;

  if (pickupDateEnd) {
    pickupDateEnd.setDate(pickupDateEnd.getDate() + 1);
  }

  const carrierId = user.role === "CARRIER" ? user.id : undefined;

  const [cargoPosts, vehicles, existingApplications, approvedVehicleCount] = await Promise.all([
    prisma.cargoPost.findMany({
      where: {
        ...activeCargoPostWhere(),
        cargoType: filters.cargoType || undefined,
        requiredVehicleType: filters.vehicleType || undefined,
        pickupCity: filters.city || undefined,
        weight: numberFilter(filters.tonnage) ? { lte: numberFilter(filters.tonnage) } : undefined,
        proposedPrice:
          numberFilter(filters.priceMin) || numberFilter(filters.priceMax)
            ? {
                gte: numberFilter(filters.priceMin),
                lte: numberFilter(filters.priceMax)
              }
            : undefined,
        pickupDate: pickupDate && pickupDateEnd ? { gte: pickupDate, lt: pickupDateEnd } : undefined,
        OR: filters.q
          ? [
              { cargoName: { contains: filters.q, mode: "insensitive" } },
              { cargoType: { contains: filters.q, mode: "insensitive" } },
              { pickupCity: { contains: filters.q, mode: "insensitive" } },
              { deliveryCity: { contains: filters.q, mode: "insensitive" } }
            ]
          : undefined
      },
      orderBy: { createdAt: "desc" },
      take: 40
    }),
    prisma.vehicle.findMany({
      where: {
        carrierId,
        status: "APPROVED"
      },
      select: {
        id: true,
        brand: true,
        model: true,
        plateNumber: true
      }
    }),
    prisma.cargoApplication.findMany({
      where: { carrierId },
      select: { cargoPostId: true }
    }),
    prisma.vehicle.count({
      where: { carrierId, status: "APPROVED" }
    })
  ]);

  const appliedCargoPostIds = new Set(existingApplications.map((application) => application.cargoPostId));

  return (
    <>
      <PageSection
        title="Aktiv yük elanları"
        description="Admin təsdiqli açıq elanlara baxın və uyğun olanlara müraciət edin."
        action={<ButtonLink href="/carrier/applications">Müraciətlərim</ButtonLink>}
      />
      {approvedVehicleCount === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Müraciət üçün təsdiqlənmiş avtomobil tələb olunur.{" "}
          <ButtonLink href="/carrier/vehicles/new" variant="ghost" className="h-auto p-0 text-amber-900 underline">
            Avtomobil əlavə et
          </ButtonLink>
        </div>
      ) : null}

      <FilterPanel defaultValues={filters} />

      {cargoPosts.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {cargoPosts.map((cargo) => (
            <div key={cargo.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <CargoCard cargo={cargo} href={`/loads/${cargo.id}`} />
              {appliedCargoPostIds.has(cargo.id) ? (
                <p className="m-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                  Bu yük elanına artıq müraciət etmisiniz.
                </p>
              ) : (
                <div className="px-4 pb-4">
                  <CargoApplyForm cargoPostId={cargo.id} vehicles={vehicles} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyAccessState
          title="Aktiv yük elanı yoxdur"
          description="Yeni elanlar admin təsdiqindən sonra bu bölmədə görünəcək."
          actionHref="/carrier/dashboard"
          actionLabel="Dashboarda qayıt"
        />
      )}
    </>
  );
}
