import { NextRequest, NextResponse } from "next/server";

const UTNO_GRAPHQL =
  "https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql";

const CLOUDINARY_BASE =
  "https://res.cloudinary.com/ntb/image/upload/w_800,q_80,f_auto/v1";

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

const CABIN_QUERY = `
  query CabinDetail($id: Int!) {
    cabin(id: $id) {
      id
      name
      description
      serviceLevel
      bedsStaffed
      bedsSelfService
      bedsNoService
      media {
        uri
        altText
        type
      }
    }
  }
`;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return NextResponse.json(null, { status: 400 });

  const res = await fetch(UTNO_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://ut.no" },
    body: JSON.stringify({ query: CABIN_QUERY, variables: { id: numericId } }),
  });

  if (!res.ok) return NextResponse.json(null, { status: 502 });

  const data = await res.json();
  const raw = data.data?.cabin ?? null;
  if (!raw) return NextResponse.json(null, { status: 404 });

  const images = (raw.media ?? [])
    .filter((m: { type: string }) => m.type === "cloudinary-image")
    .map((m: { uri: string; altText?: string }) => ({
      url: `${CLOUDINARY_BASE}/${m.uri}`,
      alt: m.altText ?? undefined,
    }));

  const cabin: CabinDetail = {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? undefined,
    serviceLevel: raw.serviceLevel ?? undefined,
    bedsStaffed: raw.bedsStaffed ?? undefined,
    bedsSelfService: raw.bedsSelfService ?? undefined,
    bedsNoService: raw.bedsNoService ?? undefined,
    images: images.length > 0 ? images : undefined,
  };

  return NextResponse.json(cabin);
}
