import { NextRequest, NextResponse } from "next/server";
import { joinTrip } from "@/lib/tripStore";

const cookieName = (tripId: string) => `trip_joined_${tripId}`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (req.cookies.has(cookieName(id))) {
    return NextResponse.json({ error: "Already joined" }, { status: 409 });
  }

  const { name, stageIndices } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const trip = await joinTrip(id, name, stageIndices ?? undefined);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const participant = trip.participants.at(-1)!;
  const res = NextResponse.json(trip);
  res.cookies.set(cookieName(id), participant.id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 90,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
