import { NextRequest, NextResponse } from "next/server";
import type { UtnoRoute } from "@/types/trip";

const UTNO_GRAPHQL =
  "https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql";

const SEARCH_QUERY = `
  query SearchRoutes($query: String!) {
    searchListItems(input: $query) {
      __typename
      ... on Route {
        id
        name
        distance
        gradingAb
        durationHoursAb
        placeA
        placeB
      }
    }
  }
`;

interface UtnoRouteNode {
  __typename: "Route";
  id: number;
  name: string;
  distance?: number;
  gradingAb?: string;
  durationHoursAb?: number;
  placeA?: string;
  placeB?: string;
}

interface UtnoSearchItem {
  __typename: string;
}

interface UtnoResponse {
  data?: { searchListItems: (UtnoSearchItem | UtnoRouteNode)[] };
  errors?: { message: string }[];
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query?.trim()) return NextResponse.json({ routes: [] });

  const res = await fetch(UTNO_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://ut.no",
    },
    body: JSON.stringify({ query: SEARCH_QUERY, variables: { query } }),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Upstream error: ${res.status}` },
      { status: res.status }
    );
  }

  const data: UtnoResponse = await res.json();

  if (data.errors?.length) {
    return NextResponse.json({ error: data.errors[0].message }, { status: 502 });
  }

  const routes: UtnoRoute[] = (data.data?.searchListItems ?? [])
    .filter((item): item is UtnoRouteNode => item.__typename === "Route")
    .map((node) => ({
      id: String(node.id),
      name: node.name,
      description:
        node.placeA && node.placeB
          ? `${node.placeA} → ${node.placeB}`
          : undefined,
      distanceKm: node.distance != null ? node.distance / 1000 : undefined,
      durationMinutes: node.durationHoursAb != null ? node.durationHoursAb * 60 : undefined,
      difficulty: node.gradingAb ?? undefined,
    }));

  return NextResponse.json({ routes });
}
