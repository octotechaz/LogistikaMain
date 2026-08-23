import { CargoOwnerLoadForm } from "@/components/CargoOwnerLoadForm";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ButtonLink } from "@/components/ui/Button";
import { requireRole } from "@/lib/auth";

export default async function CargoOwnerLoadNewPage() {
  const user = await requireRole(["CARGO_OWNER"]);

  return (
    <DashboardLayout user={user} currentPath="/cargo-owner/loads/new">
      <div className="page-shell space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-logistics-orange">Yüklərim</p>
            <h1 className="text-3xl font-bold text-navy-900">Yeni yük yerləşdir</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Yük məlumatlarını doldurun. Operator uyğun sürücü və ya dispetçer axtarışına başlayacaq.
            </p>
          </div>
          <ButtonLink href="/cargo-owner/loads" variant="secondary">
            Yüklərimə qayıt
          </ButtonLink>
        </div>

        <CargoOwnerLoadForm contactPhone={user.phone} />
      </div>
    </DashboardLayout>
  );
}
