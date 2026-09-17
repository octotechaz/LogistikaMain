import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { fail, ok, parseZodError, requireApiUser } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { publicUserSelect } from "@/lib/prisma-selects";
import { applicationDecisionSchema } from "@/lib/validations/application";

async function decideApplication(id: string, status: "ACCEPTED" | "REJECTED", ownerUserId: string) {
  const application = await prisma.cargoApplication.findFirst({
    where: {
      id,
      cargoPost: {
        ownerId: ownerUserId
      }
    },
    include: {
      cargoPost: true,
      carrierProfile: {
        include: {
          user: { select: publicUserSelect }
        }
      }
    }
  });

  if (!application) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.cargoApplication.update({
      where: { id },
      data: { status },
      include: {
        cargoPost: true,
        vehicle: true,
        carrierProfile: {
          include: {
            user: { select: publicUserSelect }
          }
        }
      }
    });

    if (status === "ACCEPTED") {
      await tx.cargoPost.update({
        where: { id: application.cargoPostId },
        data: { status: "ASSIGNED" }
      });

      await tx.cargoApplication.updateMany({
        where: {
          cargoPostId: application.cargoPostId,
          id: { not: id },
          status: "PENDING"
        },
        data: { status: "REJECTED" }
      });
    }

    return updated;
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request, ["CARGO_OWNER"]);

  if (response) {
    return response;
  }

  if (!user) {
    return fail("Giriş tələb olunur.", 401);
  }

  try {
    const { id } = await params;
    const payload = applicationDecisionSchema.parse(await request.json());
    const updated = await decideApplication(id, payload.status as "ACCEPTED" | "REJECTED", user.id);

    if (!updated) {
      return fail("Müraciət tapılmadı və ya icazəniz yoxdur.", 404);
    }

    await createNotification({
      userId: updated.carrierProfile.userId,
      title: payload.status === "ACCEPTED" ? "Müraciət qəbul edildi" : "Müraciət rədd edildi",
      message:
        payload.status === "ACCEPTED"
          ? `"${updated.cargoPost.cargoName}" yükü üzrə müraciətiniz qəbul edildi.`
          : `"${updated.cargoPost.cargoName}" yükü üzrə müraciətiniz rədd edildi.`,
      type:
        payload.status === "ACCEPTED"
          ? "APPLICATION_ACCEPTED"
          : "APPLICATION_REJECTED"
    });

    return ok(updated);
  } catch (error) {
    return fail("Müraciət statusu yenilənmədi.", 400, parseZodError(error));
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request, ["CARGO_OWNER"]);

  if (response) {
    return response;
  }

  if (!user) {
    return fail("Giriş tələb olunur.", 401);
  }

  const formData = await request.formData();
  const status = String(formData.get("status"));
  const parsed = applicationDecisionSchema.safeParse({ status });

  if (!parsed.success) {
    return fail("Müraciət statusu düzgün deyil.", 400);
  }

  const { id } = await context.params;
  const updated = await decideApplication(id, parsed.data.status as "ACCEPTED" | "REJECTED", user.id);

  if (!updated) {
    return fail("Müraciət tapılmadı və ya icazəniz yoxdur.", 404);
  }

  await createNotification({
    userId: updated.carrierProfile.userId,
    title: parsed.data.status === "ACCEPTED" ? "Müraciət qəbul edildi" : "Müraciət rədd edildi",
    message:
      parsed.data.status === "ACCEPTED"
        ? `"${updated.cargoPost.cargoName}" yükü üzrə müraciətiniz qəbul edildi.`
        : `"${updated.cargoPost.cargoName}" yükü üzrə müraciətiniz rədd edildi.`,
    type:
      parsed.data.status === "ACCEPTED"
        ? "APPLICATION_ACCEPTED"
        : "APPLICATION_REJECTED"
  });

  return NextResponse.redirect(new URL("/cargo-owner/applications", request.url), 303);
}
