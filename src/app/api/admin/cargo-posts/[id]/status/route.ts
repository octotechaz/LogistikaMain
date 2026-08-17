import { z } from "zod";

import { fail, ok, parseZodError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { runSmartMatching } from "@/lib/smart-matching";

const STATUS_MAP = {
  APPROVED: "ACTIVE",
  PENDING: "CANCELLED",
  REJECTED: "CANCELLED"
} as const;

const bodySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  rejectionReason: z.string().trim().max(500).optional()
});

function resolveWhere(id: string) {
  if (/^\d+$/.test(id)) {
    return { legacySqliteId: Number(id) };
  }
  return { id };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request, ["ADMIN"]);

  if (response) {
    return response;
  }

  if (!user) {
    return fail("Giriş tələb olunur.", 401);
  }

  const { id } = await params;

  try {
    const payload = bodySchema.parse(await request.json());
    const where = resolveWhere(id);
    const existing = await prisma.cargoPost.findFirst({ where });

    if (!existing) {
      return fail("Elan tapılmadı.", 404);
    }

    const updated = await prisma.cargoPost.update({
      where: { id: existing.id },
      data: {
        legacyAdminStatus: payload.status,
        status: STATUS_MAP[payload.status],
        deactivatedAt: null
      },
      include: {
        images: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true
          }
        }
      }
    });

    // When a cargo post is approved (becomes ACTIVE), run smart matching to
    // notify the best-suited drivers. This is fire-and-forget and must never
    // break the admin approval action, so it is intentionally not awaited.
    if (payload.status === "APPROVED") {
      runSmartMatching(existing.id).catch((error) => {
        console.error("Smart matching uğursuz oldu:", error);
      });
    }

    return ok(updated);
  } catch (error) {
    return fail("Status yenilənmədi.", 400, parseZodError(error));
  }
}
