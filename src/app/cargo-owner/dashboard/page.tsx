import { OwnerDashboardPageClient } from "@/components/classifieds/OwnerPagesClient";
import { requireRole } from "@/lib/auth";

export default async function CargoOwnerDashboardPage() {
  const user = await requireRole(["CARGO_OWNER"]);

  const sessionUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role
  };

  return <OwnerDashboardPageClient sessionUser={sessionUser} />;
}
