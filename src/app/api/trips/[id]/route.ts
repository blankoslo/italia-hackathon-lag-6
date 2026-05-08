import { NextRequest, NextResponse } from "next/server";
import { getStoredTrip, updateTripDates } from "@/lib/tripStore";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trip = await getStoredTrip(id);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(trip);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { startDate, endDate } = await req.json();
  const trip = await updateTripDates(id, startDate || undefined, endDate || undefined);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(trip);
}
