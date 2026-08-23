import { VehicleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export default async function AdminVehiclesPage() {
  await requireRole(["ADMIN"]);

  const pending = await prisma.vehicle.findMany({
    where: { status: VehicleStatus.PENDING },
    orderBy: { createdAt: "desc" },
    include: {
      carrier: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      images: {
        take: 1,
      },
      carrierProfile: false,
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-navy-900">Avtomobil təsdiqləri</h1>
      <p className="mt-1 text-slate-600">
        Admin təsdiqi gözləyən avtomobillər.
      </p>

      {pending.length === 0 ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Gözləyən avtomobil yoxdur.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid gap-0 bg-slate-50 p-3 text-sm font-semibold text-slate-700 grid-cols-[2fr,1fr,140px] sm:grid-cols-[2fr,1fr,190px,120px]">
            <div>Avtomobil</div>
            <div>Daşıyıcı</div>
            <div className="hidden sm:block">Şəkil</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="divide-y divide-slate-200">
            {pending.map((v) => {
              const imgUrl = v.images[0]?.url ?? null;
              return (
                <div
                  key={v.id}
                  className="grid grid-cols-[2fr,1fr] gap-4 p-4 sm:grid-cols-[2fr,1fr,190px,120px] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-navy-900">
                      {v.brand} {v.model}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      Nömrə: <span className="font-medium text-slate-800">{v.plateNumber}</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      Tonnaj:{" "}
                      <span className="font-medium text-slate-800">{v.capacityTons}</span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-800">
                      {v.carrier.firstName} {v.carrier.lastName}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">{v.carrier.phone}</div>
                  </div>

                  <div className="hidden sm:block">
                    {imgUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imgUrl}
                        alt={`${v.brand} ${v.model}`}
                        className="h-16 w-24 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-24 items-center justify-center rounded-md bg-slate-100 text-slate-400 text-xs">
                        (şəkil yoxdur)
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <form
                      action={`/api/admin/vehicles/${v.id}/status`}
                      method="POST"
                    >
                      <input type="hidden" name="status" value={VehicleStatus.APPROVED} />
                      <button
                        type="submit"
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        Təsdiqlə
                      </button>
                    </form>

                    <form
                      action={`/api/admin/vehicles/${v.id}/status`}
                      method="POST"
                    >
                      <input type="hidden" name="status" value={VehicleStatus.REJECTED} />
                      <button
                        type="submit"
                        className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100"
                      >
                        İmtina
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

