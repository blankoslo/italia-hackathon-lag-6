"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { searchRoutes, fetchRoute } from "./utno";
import { useTrips } from "@/context/TripContext";
import { downloadTilesForBounds } from "@/features/map/downloadTiles";
import { useRouteFilters, CATEGORY_CONFIG, ALL_CATEGORIES } from "./filters";
import { ClassicRoutes } from "./ClassicRoutes";
import type { UtnoRoute, Trip } from "@/types/trip";

type LatLngBounds = [[number, number], [number, number]];

const DIFFICULTY_LABELS: Record<string, { label: string; className: string }> = {
  EASY:       { label: "Enkel",          className: "bg-green-100 text-green-800" },
  MODERATE:   { label: "Middels",        className: "bg-yellow-100 text-yellow-800" },
  TOUGH:      { label: "Krevende",       className: "bg-orange-100 text-orange-800" },
  VERY_TOUGH: { label: "Meget krevende", className: "bg-red-100 text-red-800" },
};

function DifficultyChip({ difficulty }: { difficulty?: string }) {
  if (!difficulty) return null;
  const cfg = DIFFICULTY_LABELS[difficulty];
  if (!cfg) return <span className="text-gray-400 text-xs">{difficulty}</span>;
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function boundsFromCoordinates(coords: [number, number][]): LatLngBounds | null {
  if (!coords.length) return null;
  const lats = coords.map(([, lat]) => lat);
  const lons = coords.map(([lon]) => lon);
  return [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ];
}

interface Props {
  onFocus?: (bounds: LatLngBounds) => void;
  onResultsChange?: (routes: UtnoRoute[]) => void;
}

type Tab = "search" | "classic";

export function RouteSearch({ onFocus, onResultsChange }: Props) {
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UtnoRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const router = useRouter();
  const { trips, createTrip, saveTrip, deleteTrip } = useTrips();
  const {
    activeFilters,
    toggle,
    filterTrips,
    filterRoutes,
    mostRestrictiveFilter,
    mostRestrictiveRouteFilter,
  } = useRouteFilters();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function runSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { routes } = await searchRoutes(q);
      // Search results lack duration/difficulty; fetch details so filters work.
      const enriched = await Promise.all(
        routes.map((r) => fetchRoute(r.id).catch(() => r))
      );
      setResults(enriched);
      onResultsChange?.(enriched);
    } catch {
      setError("Søk feilet — sjekk nettilgang");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length >= 3) {
      debounceRef.current = setTimeout(() => runSearch(query), 400);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch(query);
  }

  async function handleSave(route: UtnoRoute) {
    const full = route.coordinates?.length ? route : await fetchRoute(route.id);
    const trip = createTrip(full.name);
    trip.routes = [full];
    saveTrip(trip);
    const coords = full.coordinates ?? [];
    if (coords.length) {
      const lats = coords.map(([, lat]) => lat);
      const lons = coords.map(([lon]) => lon);
      downloadTilesForBounds([
        [Math.min(...lats), Math.min(...lons)],
        [Math.max(...lats), Math.max(...lons)],
      ]);
    }
  }

  async function handleShare(trip: Trip) {
    setSharingId(trip.id);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trip.name,
          routeIds: trip.routes.map((r) => r.id),
          startDate: trip.startDate,
          endDate: trip.endDate,
        }),
      });
      const { id } = await res.json();
      router.push(`/tur/${id}`);
    } catch {
      setSharingId(null);
    }
  }

  function handleFocusTrip(trip: Trip) {
    const coords = trip.routes.flatMap((r) => r.coordinates ?? []);
    const bounds = boundsFromCoordinates(coords);
    if (bounds) onFocus?.(bounds);
  }

  function handleFocusRoute(route: UtnoRoute) {
    const bounds = boundsFromCoordinates(route.coordinates ?? []);
    if (bounds) onFocus?.(bounds);
  }

  const savedIds = new Set(trips.flatMap((t) => t.routes.map((r) => r.id)));
  const filteredResults = filterRoutes(results);
  const filteredTrips = filterTrips(trips);
  const hasFilters = activeFilters.size > 0;
  const showFilters = results.length > 0 || trips.length > 0;

  const resultSuggestion =
    hasFilters && results.length > 0 && filteredResults.length === 0
      ? mostRestrictiveRouteFilter(results)
      : null;

  const tripSuggestion =
    hasFilters && trips.length > 0 && filteredTrips.length === 0
      ? mostRestrictiveFilter(trips)
      : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex rounded border overflow-hidden text-xs font-medium">
        <button
          onClick={() => setTab("search")}
          className={`flex-1 py-1.5 transition-colors ${
            tab === "search" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Søk
        </button>
        <button
          onClick={() => setTab("classic")}
          className={`flex-1 py-1.5 transition-colors ${
            tab === "classic" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Klassiske ruter
        </button>
      </div>

      {tab === "classic" && (
        <ClassicRoutes onFocus={onFocus} onResultsChange={onResultsChange} />
      )}

      {tab === "search" && (
      <form onSubmit={handleSearch}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søk turruter på ut.no…"
          className="w-full rounded border px-2 py-1 text-sm"
        />
      </form>
      )}

      {tab === "search" && (
        <>
          {error && <p className="text-xs text-red-600">{error}</p>}

          {loading && (
            <ul className="flex flex-col gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="flex items-start justify-between gap-2 rounded bg-gray-50 p-2">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="h-3 w-3/4 rounded bg-gray-200 animate-pulse" />
                    <div className="h-3 w-1/3 rounded bg-gray-200 animate-pulse" />
                  </div>
                  <div className="h-5 w-10 shrink-0 rounded bg-gray-200 animate-pulse" />
                </li>
              ))}
            </ul>
          )}

          {showFilters && (
            <div>
              <p className="mb-1 text-xs font-semibold text-gray-600">Filtrer turer</p>
              <div className="flex flex-wrap gap-1">
                {ALL_CATEGORIES.map((cat) => {
                  const active = activeFilters.has(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggle(cat)}
                      title={CATEGORY_CONFIG[cat].description}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                        active
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {CATEGORY_CONFIG[cat].label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div>
              {filteredResults.length === 0 ? (
                <div className="rounded bg-yellow-50 p-2 text-xs text-yellow-800">
                  Ingen søkeresultater matcher filtrene.
                  {resultSuggestion && (
                    <button className="ml-1 underline" onClick={() => toggle(resultSuggestion)}>
                      Fjern «{CATEGORY_CONFIG[resultSuggestion].label}»?
                    </button>
                  )}
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {filteredResults.map((route) => (
                    <li
                      key={route.id}
                      className="flex items-start justify-between gap-2 rounded bg-gray-50 p-2 text-xs cursor-pointer hover:bg-gray-100"
                      onClick={() => handleFocusRoute(route)}
                    >
                      <div>
                        <p className="font-medium">{route.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {route.distanceKm != null && (
                            <span className="text-gray-500">{route.distanceKm.toFixed(1)} km</span>
                          )}
                          <DifficultyChip difficulty={route.difficulty} />
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSave(route); }}
                        disabled={savedIds.has(route.id)}
                        className="shrink-0 rounded bg-blue-600 px-2 py-0.5 text-white disabled:bg-gray-300"
                      >
                        {savedIds.has(route.id) ? "Lagret" : "Lagre"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {trips.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-gray-600">Mine turer (lagret offline)</p>

          {filteredTrips.length === 0 ? (
            <div className="rounded bg-yellow-50 p-2 text-xs text-yellow-800">
              Ingen turer matcher filtrene.
              {tripSuggestion && (
                <button className="ml-1 underline" onClick={() => toggle(tripSuggestion)}>
                  Fjern «{CATEGORY_CONFIG[tripSuggestion].label}»?
                </button>
              )}
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {filteredTrips.map((trip) => (
                <li
                  key={trip.id}
                  className="flex items-center justify-between rounded bg-green-50 px-2 py-1 text-xs cursor-pointer hover:bg-green-100"
                  onClick={() => handleFocusTrip(trip)}
                >
                  <span className="truncate flex-1">{trip.name}</span>
                  <div className="flex items-center gap-1 ml-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShare(trip); }}
                      title="Kopier delingslenke"
                      disabled={sharingId === trip.id}
                      className="rounded bg-green-600 px-2 py-0.5 text-white hover:bg-green-700 text-xs disabled:opacity-60"
                    >
                      {sharingId === trip.id ? "…" : "Opprett tur"}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteTrip(trip.id); }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
