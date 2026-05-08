import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { decodeShareToken } from "@/lib/tripShare";
import { getStoredTrip } from "@/lib/tripStore";
import { TripMap } from "./TripMap";
import { RSVPSection } from "./RSVPSection";
import { CopyLinkButton } from "./CopyLinkButton";
import { TripWeather } from "./TripWeather";
import { TripTimeline } from "./TripTimeline";
import { PackingList } from "./PackingList";
import { ExpenseSection } from "./ExpenseSection";
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
    <div className="min-h-screen" style={{ background: "var(--color-background)" }}>
      {/* App bar */}
      <header
        className="px-6 py-3 flex items-center justify-between"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span
          className="text-sm font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-brand)" }}
        >
          Friluftskompis
        </span>
        <CopyLinkButton />
      </header>

      {/* Hero */}
      <section
        className="px-6 py-6"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text)", letterSpacing: "-0.02em" }}
          >
            {name}
          </h1>
          {(startDate || endDate) && (
            <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>
              {startDate && formatDate(startDate)}
              {endDate && endDate !== startDate && ` – ${formatDate(endDate)}`}
            </p>
          )}
          {totalKm > 0 && (
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {routes.length} {routes.length === 1 ? "etappe" : "etapper"} · {totalKm.toFixed(1)} km totalt
            </p>
          )}
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-6 flex flex-col gap-6">
        {/* RSVP */}
        {storedTrip ? (
          <RSVPSection
            tripId={storedTrip.id}
            initial={storedTrip.participants}
            alreadyJoined={alreadyJoined}
            stageNames={routes.map(r => r.name)}
          />
        ) : (
          <section>
            <SectionLabel>Deltakere</SectionLabel>
            <div
              className="rounded-2xl p-4 text-sm italic"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              Del via «Opprett tur»-knappen i appen for å aktivere påmelding.
            </div>
          </section>
        )}

        {/* Map */}
        <section className="rounded-2xl overflow-hidden" style={{ height: 320, border: "1px solid var(--color-border)", boxShadow: "var(--shadow-md)" }}>
          <TripMap routes={routes} />
        </section>

        {/* Day-by-day timeline — F7 B3+B6 */}
        {routes.length > 0 && (
          <TripTimeline routes={routes} startDate={startDate} tripId={storedTrip?.id} />
        )}

        {/* Route list */}
        {routes.length > 0 && (
          <section>
            <SectionLabel>Ruter</SectionLabel>
            <ul className="flex flex-col gap-2">
              {routes.map((route) => (
                <li
                  key={route.id}
                  className="rounded-2xl p-4"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  <p className="font-medium" style={{ color: "var(--color-text)" }}>{route.name}</p>
                  <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                    {route.distanceKm != null && `${route.distanceKm.toFixed(1)} km`}
                    {route.difficulty && ` · ${DIFFICULTY_LABELS[route.difficulty] ?? route.difficulty}`}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Weather */}
        <TripWeather
          routes={routes}
          tripId={storedTrip?.id ?? null}
          initialStart={startDate}
          initialEnd={endDate}
        />

        {/* Packing list */}
        <section>
          <SectionLabel>Pakkeliste</SectionLabel>
          <PackingList
            routes={routes}
            startDate={startDate}
            participantCount={storedTrip?.participants.length ?? 1}
          />
        </section>

        {/* Expenses — R1 */}
        {storedTrip && storedTrip.participants.length > 0 && (
          <ExpenseSection
            tripId={storedTrip.id}
            participants={storedTrip.participants}
            initial={storedTrip.expenses ?? []}
            stageNames={routes.map(r => r.name)}
          />
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xs font-bold uppercase tracking-widest mb-2"
      style={{ color: "var(--color-text-secondary)" }}
    >
      {children}
    </h2>
  );
}
