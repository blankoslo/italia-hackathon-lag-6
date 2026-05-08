import { NextRequest, NextResponse } from "next/server";
import { getStoredTrip, addExpense } from "@/lib/tripStore";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trip = await getStoredTrip(id);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(trip.expenses ?? []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { description, amount, paidBy, splitAmong } = await req.json();
  if (!description || !amount || !paidBy || !splitAmong?.length) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const trip = await addExpense(id, { description, amount: Number(amount), paidBy, splitAmong });
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(trip.expenses);
}
