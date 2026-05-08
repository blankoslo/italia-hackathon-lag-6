import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { decodeShareToken } from "@/lib/tripShare";
import { getStoredTrip } from "@/lib/tripStore";
import { TripMap } from "./TripMap";
import { RSVPSection } from "./RSVPSection";
import { CopyLinkButton } from "./CopyLinkButton";
import { TripWeather } from "./TripWeather";
import { PackingList } from "./PackingList";
import type { UtnoRoute } from "@/types/trip";
import type { StoredTrip } from "@/lib/tripStore";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchRoute(id: string): Promise<UtnoRoute | null> {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/routes/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: "Enkel",
  MODERATE: "Middels",
  TOUGH: "Krevende",
  VERY_TOUGH: "Meget krevende",
};

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let storedTrip: StoredTrip | null = null;
  let name: string;
  let routeIds: string[];
  let startDate: string | undefined;
  let endDate: string | undefined;

  if (UUID_RE.test(token)) {
    storedTrip = await getStoredTrip(token);
    if (!storedTrip) notFound();
    ({ name, routeIds, startDate, endDate } = storedTrip);
  } else {
    const payload = decodeShareToken(token);
    if (!payload) notFound();
    name = payload.n;
    routeIds = payload.r;
    startDate = payload.s;
    endDate = payload.e;
  }

  const routes = (
    await Promise.all(routeIds.map(fetchRoute))
  ).filter((r): r is UtnoRoute => r !== null);

  const totalKm = routes.reduce((s, r) => s + (r.distanceKm ?? 0), 0);

  const alreadyJoined = storedTrip
    ? (await cookies()).has(`trip_joined_${storedTrip.id}`)
    : false;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* App bar */}
      <header className="border-b bg-white px-6 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-green-700">Friluftskompis</span>
        <CopyLinkButton />
      </header>

      {/* Hero */}
      <section className="bg-white border-b px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
          {(startDate || endDate) && (
            <p className="mt-1 text-gray-500">
              {startDate && formatDate(startDate)}
              {endDate && endDate !== startDate && ` – ${formatDate(endDate)}`}
            </p>
          )}
          {totalKm > 0 && (
            <p className="mt-2 text-sm text-gray-500">
              {routes.length} {routes.length === 1 ? "etappe" : "etapper"} · {totalKm.toFixed(1)} km totalt
            </p>
          )}
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-6 flex flex-col gap-6">
        {/* RSVP — shown first so new visitors are prompted immediately */}
        {storedTrip ? (
          <RSVPSection
            tripId={storedTrip.id}
            initial={storedTrip.participants}
            alreadyJoined={alreadyJoined}
          />
        ) : (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Deltakere
            </h2>
            <div className="bg-white rounded-lg border p-4 text-sm text-gray-400 italic">
              Del via «Opprett tur»-knappen i appen for å aktivere påmelding.
            </div>
          </section>
        )}

        {/* Map */}
        <section className="rounded-xl overflow-hidden border shadow-sm" style={{ height: 320 }}>
          <TripMap routes={routes} />
        </section>

        {/* Route list */}
        {routes.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Ruter
            </h2>
            <ul className="flex flex-col gap-2">
              {routes.map((route) => (
                <li key={route.id} className="bg-white rounded-lg border p-4">
                  <p className="font-medium text-gray-900">{route.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {route.distanceKm != null && `${route.distanceKm.toFixed(1)} km`}
                    {route.difficulty && ` · ${DIFFICULTY_LABELS[route.difficulty] ?? route.difficulty}`}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Weather — B1 */}
        <TripWeather
          routes={routes}
          tripId={storedTrip?.id ?? null}
          initialStart={startDate}
          initialEnd={endDate}
        />

        {/* Packing list — P1 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Pakkeliste
          </h2>
            <PackingList
              routes={routes}
              startDate={startDate}
              participantCount={storedTrip?.participants.length ?? 1}
            />
        </section>

        {/* Expenses — placeholder for R1 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Utgifter
          </h2>
          <div className="bg-white rounded-lg border p-4 text-sm text-gray-400 italic">
            Ingen utgifter registrert.
          </div>
        </section>
      </div>
    </div>
  );
}
