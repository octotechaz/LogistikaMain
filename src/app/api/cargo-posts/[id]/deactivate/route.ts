import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { fail, requireApiUser } from "@/lib/api";

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

  await prisma.cargoPost.update({
    where: { id },
    data: {
      status: "CANCELLED",
      deactivatedAt: new Date()
    }
  });

  return NextResponse.redirect(new URL("/cargo-owner/cargo-posts", request.url), 303);
}
