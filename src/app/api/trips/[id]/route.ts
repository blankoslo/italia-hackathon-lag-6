import { NextRequest, NextResponse } from "next/server";
import { getStoredTrip } from "@/lib/tripStore";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trip = await getStoredTrip(id);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(trip);
}
