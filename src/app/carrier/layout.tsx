import { DashboardShell } from "@/components/classifieds/shared";
import { requireRole } from "@/lib/auth";

export default async function CarrierLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["CARRIER", "ADMIN"]);

  return (
    <DashboardShell
      section="carrier"
      sessionUser={{
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role
      }}
    >
      {children}
    </DashboardShell>
  );
}
