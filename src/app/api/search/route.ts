import { NextRequest, NextResponse } from "next/server";

const UTNO_GRAPHQL =
  "https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql";

export interface SearchResult {
  id: string;
  name: string;
  category: "fjelltopp" | "område" | "hytte" | "sted";
  lat: number;
  lon: number;
}

// ---- Kartverket ----

const OMRÅDE_TYPES = new Set([
  "Fjellområde", "Verneområde", "Nasjonalpark", "Naturreservat",
  "Dal", "Vidde", "Utmark", "Slette",
]);

interface KartverketNavn {
  skrivemåte: string;
  navneobjekttype: string;
  representasjonspunkt: { nord: number; øst: number };
}

async function fetchKartverket(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    sok: query, fuzzy: "true", utkoordsys: "4258", treffPerSide: "8",
  });
  const res = await fetch(`https://ws.geonorge.no/stedsnavn/v1/navn?${params}`);
  if (!res.ok) return [];
  const data: { navn: KartverketNavn[] } = await res.json();

  return data.navn.map((n, i) => ({
    id: `kv-${i}-${n.skrivemåte}`,
    name: n.skrivemåte,
    lat: n.representasjonspunkt.nord,
    lon: n.representasjonspunkt.øst,
    category: OMRÅDE_TYPES.has(n.navneobjekttype) ? "område" : "sted",
  }));
}

// ---- UT.no cabins via cabinsNear ----

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

async function fetchCabins(lat: number, lon: number): Promise<SearchResult[]> {
  const res = await fetch(UTNO_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://ut.no" },
    body: JSON.stringify({
      query: CABINS_NEAR_QUERY,
      variables: { coordinates: [lon, lat], maxDistance: 25000 },
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const items: { cabin: { id: number; name: string; geojson?: { coordinates: [number, number] } } }[] =
    data.data?.cabinsNear ?? [];

  return items
    .filter((i) => i.cabin.geojson)
    .slice(0, 5)
    .map((i) => ({
      id: `cabin-${i.cabin.id}`,
      name: i.cabin.name,
      lat: i.cabin.geojson!.coordinates[1],
      lon: i.cabin.geojson!.coordinates[0],
      category: "hytte" as const,
    }));
}

// ---- UT.no peaks via poisNear ----

const PEAKS_QUERY = `
  query PeaksNear($coordinates: [Float!]!, $maxDistance: Int!) {
    poisNear(input: { coordinates: $coordinates, maxDistance: $maxDistance }) {
      poi {
        id
        name
        primaryTypeName
        geojson
      }
    }
  }
`;

async function fetchPeaks(lat: number, lon: number): Promise<SearchResult[]> {
  const res = await fetch(UTNO_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://ut.no" },
    body: JSON.stringify({
      query: PEAKS_QUERY,
      variables: { coordinates: [lon, lat], maxDistance: 25000 },
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const items: { poi: { id: number; name: string; primaryTypeName: string; geojson?: { coordinates: [number, number] } } }[] =
    data.data?.poisNear ?? [];

  return items
    .filter((i) => i.poi.primaryTypeName === "mountain peak" && i.poi.geojson)
    .slice(0, 5)
    .map((i) => ({
      id: `peak-${i.poi.id}`,
      name: i.poi.name,
      lat: i.poi.geojson!.coordinates[1],
      lon: i.poi.geojson!.coordinates[0],
      category: "fjelltopp" as const,
    }));
}

// ---- Handler ----

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.trim().length < 3) return NextResponse.json([]);

  // Step 1: Kartverket text search (needed to get area coords for peaks)
  const kartverketResults = await fetchKartverket(query);

  // Step 2: cabins + nearby peaks in parallel, both using area coords
  const firstArea = kartverketResults.find((r) => r.category === "område") ?? kartverketResults[0];
  const [cabins, peaks] = await Promise.all([
    firstArea ? fetchCabins(firstArea.lat, firstArea.lon) : Promise.resolve([]),
    firstArea ? fetchPeaks(firstArea.lat, firstArea.lon) : Promise.resolve([]),
  ]);

  const kartverketNames = new Set(kartverketResults.map((r) => r.name.toLowerCase()));
  const uniqueCabins = cabins.filter((c) => !kartverketNames.has(c.name.toLowerCase()));

  const merged: SearchResult[] = [
    ...kartverketResults.filter((r) => r.category === "område"),
    ...peaks,
    ...uniqueCabins,
    ...kartverketResults.filter((r) => r.category === "sted"),
  ];

  // Deduplicate: drop any result whose name or coordinates already appear earlier in the list
  const seenNames = new Set<string>();
  const seenCoords = new Set<string>();
  const results = merged.filter((r) => {
    const nameKey = r.name.toLowerCase();
    const coordKey = `${r.lat.toFixed(3)},${r.lon.toFixed(3)}`;
    if (seenNames.has(nameKey) || seenCoords.has(coordKey)) return false;
    seenNames.add(nameKey);
    seenCoords.add(coordKey);
    return true;
  });

  return NextResponse.json(results);
}
