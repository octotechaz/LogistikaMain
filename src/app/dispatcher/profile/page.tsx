
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { requireRole } from "@/lib/auth";

export default async function DispatcherProfilePage() {
  const user = await requireRole(["DISPATCHER", "ADMIN"]);
  const profile = user.dispatcherProfile;

  return (
    <DashboardLayout user={user} currentPath="/dispatcher/profile">
      <div className="page-shell">
        <div>
          <p className="text-sm font-semibold text-logistics-orange">Dispetçer profili</p>
          <h1 className="text-3xl font-bold text-navy-900">{profile?.companyName ?? `${user.firstName} ${user.lastName}`}</h1>
          <p className="mt-2 text-sm text-slate-600">Dispetçer kimi bir neçə maşını operator uyğunlaşdırmasına qoşursunuz.</p>
        </div>

        {profile ? (
          <section className="rounded-lg border border-navy-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-navy-900">{profile.companyName}</h2>
                <p className="mt-1 text-sm text-slate-600">{profile.vehicleCount} maşın · {profile.vehicleTypes.join(", ")}</p>
              </div>
              <StatusBadge status={profile.status} />
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              <p><strong>Telefon:</strong> {user.phone}</p>
              <p><strong>WhatsApp:</strong> {profile.whatsappPhone}</p>
              <p><strong>İstiqamətlər:</strong> {profile.routes.join(", ")}</p>
              <p><strong>Aktivlik balı:</strong> {profile.activityScore}</p>
            </div>
            {profile.note ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{profile.note}</p> : null}
          </section>
        ) : (
          <div className="rounded-lg border border-navy-100 bg-white p-5 text-sm text-slate-600 shadow-sm">Profil məlumatı tapılmadı.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
