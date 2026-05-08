import { NextRequest, NextResponse } from "next/server";

const UTNO_GRAPHQL =
  "https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql";

const CABINS_NEAR_QUERY = `
  query CabinsNear($coordinates: [Float!]!, $maxDistance: Int!) {
    cabinsNear(input: { coordinates: $coordinates, maxDistance: $maxDistance }) {
      cabin {
        id
        name
        serviceLevel
        geojson
      }
    }
  }
`;

export interface CabinResult {
  id: string;
  name: string;
  lat: number;
  lon: number;
  serviceLevel?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");
  const radius = parseInt(searchParams.get("radius") ?? "25000", 10);

  if (isNaN(lat) || isNaN(lon)) return NextResponse.json([]);

  const res = await fetch(UTNO_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://ut.no" },
    body: JSON.stringify({
      query: CABINS_NEAR_QUERY,
      variables: {
        coordinates: [lon, lat],
        maxDistance: Math.min(radius, 150000),
      },
    }),
  });

  if (!res.ok) return NextResponse.json([]);

  const data = await res.json();
  const items: {
    cabin: {
      id: number;
      name: string;
      serviceLevel?: string;
      geojson?: { coordinates: [number, number] };
    };
  }[] = data.data?.cabinsNear ?? [];

  const cabins: CabinResult[] = items
    .filter((i) => i.cabin.geojson)
    .map((i) => ({
      id: `cabin-${i.cabin.id}`,
      name: i.cabin.name,
      serviceLevel: i.cabin.serviceLevel ?? undefined,
      lat: i.cabin.geojson!.coordinates[1],
      lon: i.cabin.geojson!.coordinates[0],
    }));

  return NextResponse.json(cabins);
}
