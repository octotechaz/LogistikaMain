
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { requireRole } from "@/lib/auth";

export default async function DriverProfilePage() {
  const user = await requireRole(["DRIVER", "ADMIN"]);
  const profile = user.driverProfile;

  return (
    <DashboardLayout user={user} currentPath="/driver/profile">
      <div className="page-shell">
        <div>
          <p className="text-sm font-semibold text-logistics-orange">Sürücü profili</p>
          <h1 className="text-3xl font-bold text-navy-900">{user.firstName} {user.lastName}</h1>
          <p className="mt-2 text-sm text-slate-600">Siz yükləri WhatsApp/SMS/zəng vasitəsilə passiv rejimdə alırsınız.</p>
        </div>

        {profile ? (
          <section className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-navy-900">{profile.brand} {profile.model}</h2>
                <p className="mt-1 text-sm text-slate-600">{profile.vehicleType} · {profile.capacityTons} ton · {profile.plateNumber}</p>
              </div>
              <StatusBadge status={profile.status} />
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              <p><strong>WhatsApp:</strong> {profile.whatsappPhone}</p>
              <p><strong>Şəhər:</strong> {profile.city}</p>
              <p><strong>İstiqamətlər:</strong> {profile.routes.join(", ")}</p>
              <p><strong>Aktivlik balı:</strong> {profile.activityScore}</p>
              <p><strong>İş günləri:</strong> {profile.workingDays.join(", ")}</p>
              <p><strong>İş saatları:</strong> {profile.workingHours}</p>
            </div>
          </section>
        ) : (
          <div className="rounded-lg border border-navy-100 bg-white p-5 text-sm text-slate-600 shadow-sm">Profil məlumatı tapılmadı.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
