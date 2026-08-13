import { prisma } from "@/lib/prisma";
import { fail, ok, requireApiUser } from "@/lib/api";
import {
  calculateExpiresAtFromPickupDeadline,
  normalizePickupDeadlineDateValue
} from "@/lib/pickup-deadline";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request, ["CARGO_OWNER", "ADMIN"]);

  if (response) {
    return response;
  }

  if (!user) {
    return fail("Giriş tələb olunur.", 401);
  }

  const { id } = await params;
  const cargoPost = await prisma.cargoPost.findFirst({
    where: user.role === "CARGO_OWNER" ? { id, ownerId: user.id } : { id }
  });

  if (!cargoPost) {
    return fail("Elan tapılmadı və ya icazəniz yoxdur.", 404);
  }

  const deadline = normalizePickupDeadlineDateValue(
    cargoPost.pickupDeadlineDate ?? cargoPost.pickupDate
  );

  const updated = await prisma.cargoPost.update({
    where: { id },
    data: {
      // Soft-deleted approved listings can go live again; rejected ones re-enter review.
      legacyAdminStatus:
        cargoPost.legacyAdminStatus === "REJECTED" ? "PENDING" : cargoPost.legacyAdminStatus || "PENDING",
      status: cargoPost.legacyAdminStatus === "APPROVED" ? "ACTIVE" : "CANCELLED",
      deactivatedAt: null,
      expiresAt: calculateExpiresAtFromPickupDeadline(deadline)
    },
    include: { images: true }
  });

  return ok(updated);
}
