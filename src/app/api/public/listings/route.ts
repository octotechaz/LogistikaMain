import { NextResponse } from "next/server";
import { getPublicListingsFromPostgres } from "@/lib/public-listings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getPublicListingsFromPostgres();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/public/listings error:", error);
    // Keep homepage usable even when the database is unavailable.
    return NextResponse.json({ data: [] });
  }
}
