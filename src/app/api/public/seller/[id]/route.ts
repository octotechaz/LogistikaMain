import { NextResponse } from "next/server";
import { getPublicListingsByOwnerFromPostgres } from "@/lib/public-listings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, companyName: true, createdAt: true },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const listings = await getPublicListingsByOwnerFromPostgres(id);
    return NextResponse.json({
      data: {
        owner: {
          id: user.id,
          name: user.companyName?.trim() || `${user.firstName} ${user.lastName}`.trim(),
          createdAt: user.createdAt,
        },
        listings,
      },
    });
  } catch (error) {
    console.error("GET /api/public/seller/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}