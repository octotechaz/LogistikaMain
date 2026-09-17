import { NextResponse } from "next/server";
import { z } from "zod";

import { fail, ok, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { publicUserSelect } from "@/lib/prisma-selects";
import { UserStatus } from "@prisma/client";

const statusSchema = z.object({ status: z.nativeEnum(UserStatus) });

async function updateStatus(request: Request, id: string, raw: unknown) {
  const { user, response } = await requireApiUser(request, ["ADMIN"]);

  if (response) return { response };

  const parsed = statusSchema.safeParse({ status: raw });
  if (!parsed.success) {
    return { response: fail("Status düzgün deyil.", 400) };
  }

  const { status } = parsed.data;

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { status },
    select: publicUserSelect,
  });

  await prisma.adminLog.create({
    data: {
      adminId: user!.id,
      action: "USER_STATUS_UPDATED",
      entityType: "User",
      entityId: id,
      metadata: JSON.stringify({ status }),
    },
  });

  return { updatedUser };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await updateStatus(request, id, body.status ?? "");

  if (result.response) return result.response;

  return ok(result.updatedUser);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formData = await request.formData();
  const result = await updateStatus(request, id, formData.get("status") ?? "");

  if (result.response) return result.response;

  return NextResponse.redirect(new URL("/admin/users", request.url), 303);
}