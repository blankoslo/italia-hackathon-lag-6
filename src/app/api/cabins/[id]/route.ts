import { NextRequest, NextResponse } from "next/server";

const UTNO_GRAPHQL =
  "https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql";

export interface CabinDetail {
  id: number;
  name: string;
  description?: string;
  serviceLevel?: string;
  bedsStaffed?: number;
  bedsSelfService?: number;
  bedsNoService?: number;
  images?: { url: string; alt?: string }[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return NextResponse.json(null, { status: 400 });

  // Use inline query format — matches the documented curl example exactly.
  // Parameterized queries with variables cause the API to reject the request.
  const query = `{ cabin(id:${numericId}) { id name description serviceLevel bedsStaffed bedsSelfService bedsNoService } }`;

  const res = await fetch(UTNO_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://ut.no" },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) return NextResponse.json(null, { status: 502 });

  const data = await res.json();
  const cabin: CabinDetail | null = data.data?.cabin ?? null;
  if (!cabin) return NextResponse.json(null, { status: 404 });

  // Attempt a second query for images — separate call so a missing field
  // doesn't break the main cabin data.
  try {
    const imgQuery = `{ cabin(id:${numericId}) { images { url alt } } }`;
    const imgRes = await fetch(UTNO_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://ut.no" },
      body: JSON.stringify({ query: imgQuery }),
    });
    if (imgRes.ok) {
      const imgData = await imgRes.json();
      const images = imgData.data?.cabin?.images;
      if (Array.isArray(images)) cabin.images = images;
    }
  } catch {
    // images are optional — ignore errors
  }

  return NextResponse.json(cabin);
}
