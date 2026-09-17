import { NextResponse } from "next/server";
import { z } from "zod";

import { fail, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { VehicleStatus } from "@prisma/client";

const statusSchema = z.object({ status: z.nativeEnum(VehicleStatus) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(request, ["ADMIN"]);

  if (response) {
    return response;
  }

  if (!user) {
    return fail("Giriş tələb olunur.", 401);
  }

  const formData = await request.formData();
  const parsed = statusSchema.safeParse({ status: formData.get("status") ?? "" });

  if (!parsed.success) {
    return fail("Status düzgün deyil.", 400);
  }

  const { status } = parsed.data;
  const { id } = await params;

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: { status },
    include: {
      carrierProfile: true,
    },
  });

  await prisma.adminLog.create({
    data: {
      adminId: user.id,
      action: "VEHICLE_STATUS_UPDATED",
      entityType: "Vehicle",
      entityId: id,
      metadata: JSON.stringify({ status }),
    },
  });

  if (vehicle.carrierProfile) {
    await createNotification({
      userId: vehicle.carrierProfile.userId,
      title: status === VehicleStatus.APPROVED ? "Avtomobil təsdiqləndi" : "Avtomobil statusu yeniləndi",
      message:
        status === VehicleStatus.APPROVED
          ? `${vehicle.brand} ${vehicle.model} avtomobiliniz təsdiqləndi.`
          : `${vehicle.brand} ${vehicle.model} avtomobilinizin statusu: ${status}.`,
      type: status === VehicleStatus.APPROVED ? "ADMIN_APPROVED" : "ADMIN_REJECTED",
    });
  }

  return NextResponse.redirect(new URL("/admin/vehicles", request.url), 303);
}