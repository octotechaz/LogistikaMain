import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export default async function EditCargoPostPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["CARGO_OWNER", "ADMIN"]);
  const { id } = await params;

  const cargoPost = await prisma.cargoPost.findFirst({
    where: user.role === "CARGO_OWNER" ? { id, ownerId: user.id } : { id },
    select: { id: true }
  });

  if (!cargoPost) {
    notFound();
  }

  redirect(`/cargo-owner/cargo-posts/new?id=${encodeURIComponent(cargoPost.id)}`);
}
