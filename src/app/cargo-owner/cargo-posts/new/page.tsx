import { Suspense } from "react";
import { OwnerLoadFormPageClient } from "@/components/classifieds/OwnerPagesClient";
import { requireRole } from "@/lib/auth";

export default async function NewCargoPostPage() {
  const user = await requireRole(["CARGO_OWNER", "ADMIN"]);

  const sessionUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role
  };

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      }
    >
      <OwnerLoadFormPageClient sessionUser={sessionUser} />
    </Suspense>
  );
}
