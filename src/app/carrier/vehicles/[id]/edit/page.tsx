
import { ImageCategory } from "@prisma/client";
import { notFound } from "next/navigation";
import { VehicleForm } from "@/components/VehicleForm";
import { PageSection } from "@/components/classifieds/shared";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["CARRIER", "ADMIN"]);
  const { id } = await params;
  const vehicle = await prisma.vehicle.findFirst({
    where: user.role === "CARRIER" ? { id, carrierId: user.id } : { id },
    include: {
      images: true
    }
  });

  if (!vehicle) {
    notFound();
  }

  return (
    <>
      <PageSection
        title={`${vehicle.brand} ${vehicle.model}`}
        description="Avtomobil məlumatlarını yeniləyin. Əhəmiyyətli dəyişikliklərdən sonra yenidən yoxlama tələb oluna bilər."
      />
      <div className="surface-panel p-5 sm:p-6">
        <VehicleForm
          mode="edit"
          initialData={{
            id: vehicle.id,
            vehicleType: vehicle.vehicleType,
            brand: vehicle.brand,
            model: vehicle.model,
            plateNumber: vehicle.plateNumber,
            driverFirstName: vehicle.driverFirstName,
            driverLastName: vehicle.driverLastName,
            driverPhone: vehicle.driverPhone,
            capacityTons: vehicle.capacityTons,
            bodyLength: vehicle.bodyLength,
            bodyWidth: vehicle.bodyWidth,
            bodyHeight: vehicle.bodyHeight,
            overallDimensions: vehicle.overallDimensions,
            workDays: vehicle.workDays,
            workHours: vehicle.workHours,
            serviceAreas: vehicle.serviceAreas,
            imageUrls: vehicle.images
              .filter((image) => image.category === ImageCategory.VEHICLE)
              .map((image) => image.url),
            documentImageUrls: vehicle.images
              .filter((image) => image.category === ImageCategory.VEHICLE_DOCUMENT)
              .map((image) => image.url)
          }}
        />
      </div>
    </>
  );
}
