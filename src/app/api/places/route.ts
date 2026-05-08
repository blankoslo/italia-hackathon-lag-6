import { NextRequest, NextResponse } from "next/server";

interface StedsnamnResponse {
  navn: Array<{
    skrivemåte: string;
    representasjonspunkt: { nord: number; øst: number };
  }>;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query?.trim()) return NextResponse.json([]);

  const params = new URLSearchParams({
    sok: query,
    fuzzy: "true",
    utkoordsys: "4258",
    treffPerSide: "10",
    side: "1",
  });

  const res = await fetch(
    `https://ws.geonorge.no/stedsnavn/v1/navn?${params}`
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: `Upstream error: ${res.status}` },
      { status: res.status }
    );
  }

  const data: StedsnamnResponse = await res.json();

  const places = data.navn.map((sted) => ({
    name: sted.skrivemåte ?? "Ukjent",
    lat: sted.representasjonspunkt.nord,
    lon: sted.representasjonspunkt.øst,
  }));

  return NextResponse.json(places);
}
