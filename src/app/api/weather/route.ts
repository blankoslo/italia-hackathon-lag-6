import { NextRequest, NextResponse } from "next/server";

export interface DaySummary {
  date: string; // YYYY-MM-DD
  tempMin: number;
  tempMax: number;
  precipMm: number;
  windMax: number;
  symbol: string; // noon symbol_code
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "lat and lon required" }, { status: 400 });
  }

  const yrLat = lat.toFixed(4);
  const yrLon = lon.toFixed(4);
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${yrLat}&lon=${yrLon}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Friluftskompis/1.0 arran.gabriel@blank.no",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Yr fetch failed" }, { status: 502 });
  }

  const data = await res.json();
  const timeseries: {
    time: string;
    data: {
      instant: { details: { air_temperature: number; wind_speed: number } };
      next_1_hours?: { summary: { symbol_code: string }; details: { precipitation_amount: number } };
      next_6_hours?: { summary: { symbol_code: string }; details: { precipitation_amount: number } };
    };
  }[] = data.properties.timeseries;

  // Group entries by UTC date
  const byDay = new Map<string, typeof timeseries>();
  for (const entry of timeseries) {
    const date = entry.time.slice(0, 10);
    if (!byDay.has(date)) byDay.set(date, []);
    byDay.get(date)!.push(entry);
  }

  const summaries: DaySummary[] = [];
  for (const [date, entries] of byDay) {
    const temps = entries.map((e) => e.data.instant.details.air_temperature);
    const winds = entries.map((e) => e.data.instant.details.wind_speed);

    // Accumulate precipitation without double-counting 6h blocks
    let precipMm = 0;
    for (const e of entries) {
      if (e.data.next_1_hours) {
        precipMm += e.data.next_1_hours.details.precipitation_amount;
      } else if (e.data.next_6_hours) {
        precipMm += e.data.next_6_hours.details.precipitation_amount;
      }
    }

    // Pick symbol closest to noon (12:00)
    const noon = entries.reduce((best, e) => {
      const h = new Date(e.time).getUTCHours();
      const bestH = new Date(best.time).getUTCHours();
      return Math.abs(h - 12) < Math.abs(bestH - 12) ? e : best;
    });
    const symbol =
      noon.data.next_1_hours?.summary.symbol_code ??
      noon.data.next_6_hours?.summary.symbol_code ??
      "cloudy";

    summaries.push({
      date,
      tempMin: Math.round(Math.min(...temps)),
      tempMax: Math.round(Math.max(...temps)),
      precipMm: Math.round(precipMm * 10) / 10,
      windMax: Math.round(Math.max(...winds)),
      symbol,
    });
  }

  return NextResponse.json(summaries);
}
