
import { ApplicationCard } from "@/components/ApplicationCard";
import {
  EmptyAccessState,
  MetricCard,
  PageSection
} from "@/components/classifieds/shared";
import { ButtonLink } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";

export default async function CarrierApplicationsPage() {
  const user = await requireRole(["CARRIER", "ADMIN"]);
  const carrierWhere = user.role === "CARRIER" ? { carrierId: user.id } : undefined;

  const applications = await prisma.cargoApplication.findMany({
    where: carrierWhere,
    include: {
      cargoPost: true,
      vehicle: true
    },
    orderBy: { createdAt: "desc" }
  });

  const pending = applications.filter((item) => item.status === "PENDING").length;
  const accepted = applications.filter((item) => item.status === "ACCEPTED").length;
  const rejected = applications.filter((item) => item.status === "REJECTED").length;

  return (
    <>
      <PageSection
        title="Mənim müraciətlərim"
        description="Göndərdiyiniz təkliflərin statusunu buradan izləyin."
        action={<ButtonLink href="/carrier/cargo-posts">Yeni müraciət</ButtonLink>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Gözləyir" value={String(pending)} icon={<Clock3 className="h-5 w-5" />} />
        <MetricCard label="Qəbul edilib" value={String(accepted)} icon={<CheckCircle2 className="h-5 w-5" />} />
        <MetricCard label="Rədd edilib" value={String(rejected)} icon={<XCircle className="h-5 w-5" />} />
      </div>

      {applications.length ? (
        <div className="grid gap-4">
          {applications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      ) : (
        <EmptyAccessState
          title="Hələ müraciət göndərməmisiniz"
          description="Aktiv yük elanlarına baxın və uyğun olanlara müraciət edin."
          actionHref="/carrier/cargo-posts"
          actionLabel="Aktiv yüklərə bax"
        />
      )}
    </>
  );
}
