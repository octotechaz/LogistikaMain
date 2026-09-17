
import { ApplicationCard } from "@/components/ApplicationCard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export default async function CargoOwnerApplicationsPage() {
  const user = await requireRole(["CARGO_OWNER", "ADMIN"]);
  const applications = await prisma.cargoApplication.findMany({
    where: user.role === "CARGO_OWNER" ? { cargoPost: { ownerId: user.id } } : undefined,
    include: {
      cargoPost: true,
      vehicle: true,
      carrierProfile: {
        include: {
          user: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <DashboardLayout user={user} currentPath="/cargo-owner/applications">
      <div className="page-shell">
        <div>
          <p className="text-sm font-semibold text-logistics-orange">Daşıyıcı müraciətləri</p>
          <h1 className="section-title">Müraciətləri idarə et</h1>
        </div>

        {applications.length ? (
          <div className="grid gap-4">
            {applications.map((application) => (
              <ApplicationCard key={application.id} application={application} decisionActions />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Hələ müraciət yoxdur"
            description="Yük elanlarınıza daşıyıcı müraciəti gələndə burada görünəcək."
            actionHref="/cargo-owner/cargo-posts/new"
            actionLabel="Yeni elan yarat"
          />
        )}
      </div>
    </DashboardLayout>
  );
}
