import { NextRequest, NextResponse } from "next/server";
import { createStoredTrip } from "@/lib/tripStore";

export async function POST(req: NextRequest) {
  const { name, routeIds, startDate, endDate } = await req.json();
  if (!name || !Array.isArray(routeIds) || routeIds.length === 0) {
    return NextResponse.json({ error: "name and routeIds required" }, { status: 400 });
  }
  const trip = await createStoredTrip({ name, routeIds, startDate, endDate });
  return NextResponse.json({ id: trip.id });
}
