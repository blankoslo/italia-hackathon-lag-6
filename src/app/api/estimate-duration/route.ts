import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const distanceKm = parseFloat(searchParams.get("distanceKm") ?? "");
  const elevationGain = parseFloat(searchParams.get("elevationGain") ?? "0");
  const difficulty = searchParams.get("difficulty") ?? "";

  if (isNaN(distanceKm) || distanceKm <= 0) {
    return NextResponse.json({ error: "distanceKm required" }, { status: 400 });
  }

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 32,
    messages: [{
      role: "user",
      content: `Estimate hiking time in minutes for a route: ${distanceKm.toFixed(1)} km, ${Math.round(elevationGain)} m elevation gain${difficulty ? `, difficulty: ${difficulty}` : ""}. Reply with only an integer (the number of minutes).`,
    }],
  });

  const text = (msg.content[0] as { type: string; text: string }).text.trim();
  const minutes = parseInt(text);
  if (isNaN(minutes)) {
    return NextResponse.json({ error: "Could not parse estimate" }, { status: 502 });
  }

  return NextResponse.json({ minutes }, { next: { revalidate: 86400 } } as never);
}
