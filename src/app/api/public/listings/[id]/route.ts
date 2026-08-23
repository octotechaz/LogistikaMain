import { NextResponse } from "next/server";
import { getPublicListingByIdFromPostgres } from "@/lib/public-listings";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const listing = await getPublicListingByIdFromPostgres(id);

    if (!listing) {
      return NextResponse.json({ data: null }, { status: 404 });
    }

    return NextResponse.json({ data: listing });
  } catch (error) {
    console.error("GET /api/public/listings/[id] error:", error);
    return NextResponse.json({ data: null }, { status: 500 });
  }
}
