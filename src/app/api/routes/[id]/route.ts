import { NextRequest, NextResponse } from "next/server";

const UTNO_GRAPHQL =
  "https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql";

const ROUTE_QUERY = `
  query GetRoute($id: Int!) {
    route(id: $id) {
      id
      name
      distance
      gradingAb
      durationHoursAb
      placeA
      placeB
      geojson
    }
  }
`;

interface UtnoRouteDetail {
  id: number;
  name: string;
  distance?: number;
  gradingAb?: string;
  durationHoursAb?: number;
  placeA?: string;
  placeB?: string;
  geojson?: { type: string; coordinates: [number, number, number][] };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const res = await fetch(UTNO_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://ut.no" },
    body: JSON.stringify({ query: ROUTE_QUERY, variables: { id: numericId } }),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Upstream error: ${res.status}` },
      { status: res.status }
    );
  }

  const data: { data?: { route: UtnoRouteDetail }; errors?: { message: string }[] } =
    await res.json();

  if (data.errors?.length) {
    return NextResponse.json({ error: data.errors[0].message }, { status: 502 });
  }

  const node = data.data?.route;
  if (!node) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Strip altitude, keep [lon, lat] pairs (GeoJSON standard)
  const coordinates: [number, number][] =
    node.geojson?.coordinates.map(([lon, lat]) => [lon, lat]) ?? [];

  return NextResponse.json({
    id: String(node.id),
    name: node.name,
    description:
      node.placeA && node.placeB ? `${node.placeA} → ${node.placeB}` : undefined,
    distanceKm: node.distance != null ? node.distance / 1000 : undefined,
    durationMinutes: node.durationHoursAb != null ? node.durationHoursAb * 60 : undefined,
    difficulty: node.gradingAb ?? undefined,
    coordinates,
  });
}
