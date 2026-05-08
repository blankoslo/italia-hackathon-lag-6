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

const DIFFICULTY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  EASY:       { label: "Enkel",          color: "#c8f7c5", bg: "var(--color-success-bg)" },
  MODERATE:   { label: "Middels",        color: "var(--color-warning-text)", bg: "var(--color-warning-bg)" },
  TOUGH:      { label: "Krevende",       color: "#ffbb99", bg: "#5a2a08" },
  VERY_TOUGH: { label: "Meget krevende", color: "var(--color-error-text)", bg: "var(--color-error-bg)" },
};

function DifficultyChip({ difficulty }: { difficulty?: string }) {
  if (!difficulty) return null;
  const cfg = DIFFICULTY_LABELS[difficulty];
  if (!cfg) return <span style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>{difficulty}</span>;
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-xs font-medium"
      style={{ background: cfg.bg, color: cfg.color }}
    >
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

  const tabBase = "flex-1 py-1.5 text-xs font-semibold transition-colors";
  const tabActive = { background: "var(--color-brand)", color: "#fff" };
  const tabInactive = { background: "var(--color-surface-raised)", color: "var(--color-text-secondary)" };

  return (
    <div className="flex flex-col gap-3">
      {/* Tab bar */}
      <div
        className="flex overflow-hidden text-xs font-medium"
        style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)" }}
      >
        <button
          onClick={() => setTab("search")}
          className={tabBase}
          style={tab === "search" ? tabActive : tabInactive}
        >
          Søk
        </button>
        <button
          onClick={() => setTab("classic")}
          className={tabBase}
          style={tab === "classic" ? tabActive : tabInactive}
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
            className="w-full text-sm px-3 py-2"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-surface-raised)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text)",
              outline: "none",
            }}
          />
        </form>
      )}

      {tab === "search" && (
        <>
          {error && (
            <p className="text-xs" style={{ color: "var(--color-error-text)" }}>
              {error}
            </p>
          )}

          {loading && (
            <ul className="flex flex-col gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-2 p-2"
                  style={{ borderRadius: "var(--radius-sm)", background: "var(--color-surface)" }}
                >
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="h-3 w-3/4 rounded animate-pulse" style={{ background: "var(--color-surface-raised)" }} />
                    <div className="h-3 w-1/3 rounded animate-pulse" style={{ background: "var(--color-surface-raised)" }} />
                  </div>
                  <div className="h-5 w-10 shrink-0 rounded animate-pulse" style={{ background: "var(--color-surface-raised)" }} />
                </li>
              ))}
            </ul>
          )}

          {showFilters && (
            <div>
              <p className="mb-1 text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                Filtrer turer
              </p>
              <div className="flex flex-wrap gap-1">
                {ALL_CATEGORIES.map((cat) => {
                  const active = activeFilters.has(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggle(cat)}
                      title={CATEGORY_CONFIG[cat].description}
                      className="px-2 py-0.5 text-xs font-medium transition-colors"
                      style={{
                        borderRadius: "var(--radius-full)",
                        background: active ? "var(--color-brand)" : "var(--color-surface-raised)",
                        color: active ? "#fff" : "var(--color-text-secondary)",
                      }}
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
                <div
                  className="p-2 text-xs"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-warning-bg)",
                    color: "var(--color-warning-text)",
                  }}
                >
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
                      className="flex items-start justify-between gap-2 p-2 text-xs cursor-pointer transition-colors"
                      style={{ borderRadius: "var(--radius-sm)", background: "var(--color-surface)" }}
                      onClick={() => handleFocusRoute(route)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-surface)")}
                    >
                      <div>
                        <p className="font-medium" style={{ color: "var(--color-text)" }}>{route.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {route.distanceKm != null && (
                            <span style={{ color: "var(--color-text-secondary)" }}>{route.distanceKm.toFixed(1)} km</span>
                          )}
                          <DifficultyChip difficulty={route.difficulty} />
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSave(route); }}
                        disabled={savedIds.has(route.id)}
                        className="shrink-0 px-2 py-0.5 text-xs text-white font-semibold transition-opacity disabled:opacity-40"
                        style={{
                          background: savedIds.has(route.id) ? "var(--color-surface-raised)" : "var(--color-brand)",
                          borderRadius: "var(--radius-sm)",
                          color: savedIds.has(route.id) ? "var(--color-text-secondary)" : "#fff",
                        }}
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
          <p className="mb-1 text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
            Mine turer (lagret offline)
          </p>

          {filteredTrips.length === 0 ? (
            <div
              className="p-2 text-xs"
              style={{
                borderRadius: "var(--radius-sm)",
                background: "var(--color-warning-bg)",
                color: "var(--color-warning-text)",
              }}
            >
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
                  className="flex items-center justify-between px-2 py-1.5 text-xs cursor-pointer transition-colors"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-success-bg)",
                  }}
                  onClick={() => handleFocusTrip(trip)}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <span className="truncate flex-1 font-medium" style={{ color: "var(--color-success-text)" }}>
                    {trip.name}
                  </span>
                  <div className="flex items-center gap-1 ml-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShare(trip); }}
                      title="Opprett delingslenke"
                      disabled={sharingId === trip.id}
                      className="px-2 py-0.5 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
                      style={{ background: "var(--color-brand)", borderRadius: "var(--radius-sm)" }}
                    >
                      {sharingId === trip.id ? "…" : "Opprett tur"}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteTrip(trip.id); }}
                      style={{ color: "var(--color-text-secondary)" }}
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
