
import { VehicleForm } from "@/components/VehicleForm";
import { PageSection } from "@/components/classifieds/shared";
import { requireRole } from "@/lib/auth";

export default async function NewVehiclePage() {
  await requireRole(["CARRIER", "ADMIN"]);

  return (
    <>
      <PageSection
        title="Yeni avtomobil"
        description="Məlumatları doldurun. Avtomobil admin təsdiqindən sonra müraciətlərdə istifadə oluna bilər."
      />
      <div className="surface-panel p-5 sm:p-6">
        <VehicleForm />
      </div>
    </>
  );
}
