import { Suspense } from "react";
import { PackingListClient } from "./PackingListClient";
import type { UtnoRoute } from "@/types/trip";

export interface PackingCategory {
  category: string;
  items: string[];
}

export interface PackingContext {
  routeNames: string[];
  totalKm: number;
  days: number;
  season: string;
  difficulty: string;
  participantCount: number;
}

async function generatePackingList(
  routes: UtnoRoute[],
  startDate?: string,
  participantCount: number = 1,
): Promise<{ categories: PackingCategory[]; context: PackingContext }> {
  const totalKm = routes.reduce((s, r) => s + (r.distanceKm ?? 0), 0);
  const days = Math.max(1, routes.reduce((s, r) => s + (r.durationDays ?? 1), 0));
  const difficulties = [...new Set(routes.map((r) => r.difficulty).filter(Boolean))];
  const month = startDate ? new Date(startDate).getMonth() + 1 : new Date().getMonth() + 1;
  const season =
    month >= 6 && month <= 8 ? "sommer" : month >= 12 || month <= 2 ? "vinter" : "vår/høst";
  const difficulty = difficulties[0] ?? "MODERATE";

  const context: PackingContext = {
    routeNames: routes.map((r) => r.name),
    totalKm,
    days,
    season,
    difficulty,
    participantCount,
  };

  const prompt = `Du er en erfaren norsk fjellvandrer. Lag en kompakt pakkeliste for denne turen:
- Ruter: ${routes.map((r) => r.name).join(", ")}
- Total distanse: ${totalKm.toFixed(1)} km over ${days} dag(er)
- Vanskelighetsgrad: ${difficulty}
- Årstid: ${season}
- Antall deltakere: ${participantCount}

For fellesutstyr (gass, kart, førstehjelp osv.), ta hensyn til at gruppen er ${participantCount} person(er).

Returner KUN et JSON-array, ingen annen tekst:
[
  {"category":"Bekledning","items":["..."]},
  {"category":"Navigasjon og sikkerhet","items":["..."]},
  {"category":"Mat og drikke","items":["..."]},
  {"category":"Overnatting","items":["..."]},
  {"category":"Førstehjelp","items":["..."]}
]`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      const text: string = data.content?.[0]?.text ?? "[]";
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const categories = JSON.parse(match[0]) as PackingCategory[];
        return { categories, context };
      }
    }
  } catch {
    // fall through to fallback
  }

  return { categories: fallback(season, difficulty), context };
}

function fallback(season: string, difficulty: string): PackingCategory[] {
  const isWinter = season === "vinter";
  const isTough = difficulty === "TOUGH" || difficulty === "VERY_TOUGH";
  return [
    {
      category: "Bekledning",
      items: ["Ullundertøy", "Fleecegenser", isWinter ? "Dunjakke" : "Lett vinterjakke", "Regnjakke og regnbukse", "Fjellstøvler", "Ullsokker (2 par)", "Lue og hansker"],
    },
    {
      category: "Navigasjon og sikkerhet",
      items: ["Kart og kompass", "Hodelykt med reservebatterier", "Fløyte", ...(isTough ? ["Sele og tau"] : []), "Powerbank"],
    },
    {
      category: "Mat og drikke",
      items: ["Vannflaske (1 liter)", "Energibarer", "Nøtteblandinger", "Lunchpakke", "Varm drikke (termos)", "Gassbrenner og kokekar"],
    },
    {
      category: "Overnatting",
      items: ["Sovepose", "Liggeunderlag", "Ørepropper"],
    },
    {
      category: "Førstehjelp",
      items: ["Førstehjelpsskrin", "Smertestillende", "Solkrem", "Brannplaster"],
    },
  ];
}

async function PackingListLoader({
  routes,
  startDate,
  participantCount,
}: {
  routes: UtnoRoute[];
  startDate?: string;
  participantCount: number;
}) {
  const { categories, context } = await generatePackingList(routes, startDate, participantCount);
  return <PackingListClient categories={categories} context={context} />;
}

export function PackingList({
  routes,
  startDate,
  participantCount,
}: {
  routes: UtnoRoute[];
  startDate?: string;
  participantCount: number;
}) {
  if (routes.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-4 text-sm text-gray-400 italic">
        Legg til ruter for å generere pakkeliste.
      </div>
    );
  }

  if (participantCount < 1) {
    return (
      <div className="bg-white rounded-lg border p-4 text-sm text-gray-400 italic">
        Meld deg på turen for å generere pakkeliste.
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-lg border p-4 flex items-center gap-3 text-sm text-gray-500">
          <svg className="animate-spin h-4 w-4 text-green-600 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Genererer pakkeliste med AI…
        </div>
      }
    >
      <PackingListLoader routes={routes} startDate={startDate} participantCount={participantCount} />
    </Suspense>
  );
}
