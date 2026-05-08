"use client";
import { useState } from "react";
import { CLASSIC_ROUTES, DIFFICULTY_BADGE, type ClassicRoute } from "@/data/classicRoutes";
import { fetchRoute } from "./utno";
import { useTrips } from "@/context/TripContext";
import { downloadTilesForBounds } from "@/features/map/downloadTiles";
import { calcElevationGain } from "@/lib/routeUtils";
import type { UtnoRoute, RouteWaypoint } from "@/types/trip";

type LatLngBounds = [[number, number], [number, number]];

interface LegData {
  route: UtnoRoute;
  fromCabin: string;
  toCabin: string;
}

interface LoadedClassicRoute {
  composite: UtnoRoute;
  legs: LegData[];
}

interface Props {
  onFocus?: (bounds: LatLngBounds) => void;
  onResultsChange?: (routes: UtnoRoute[]) => void;
}

function ElevationProfile({ elevations }: { elevations: number[] }) {
  if (elevations.length < 2) return null;
  const step = Math.max(1, Math.floor(elevations.length / 150));
  const sampled = elevations.filter((_, i) => i % step === 0);
  const minEl = Math.min(...sampled);
  const maxEl = Math.max(...sampled);
  const range = maxEl - minEl || 1;
  const W = 240;
  const H = 44;
  const pts = sampled
    .map((el, i) => {
      const x = (i / (sampled.length - 1)) * W;
      const y = H - ((el - minEl) / range) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-9 overflow-visible" preserveAspectRatio="none" aria-label="Høydeprofil">
        <defs>
          <linearGradient id="elev-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#elev-grad)" />
        <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="1.5" />
      </svg>
      <div className="flex justify-between text-[10px] leading-none mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
        <span>{minEl.toFixed(0)} moh.</span>
        <span className="text-center">Høydeprofil</span>
        <span>{maxEl.toFixed(0)} moh.</span>
      </div>
    </div>
  );
}

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY:       "bg-green-500",
  MODERATE:   "bg-yellow-500",
  TOUGH:      "bg-orange-500",
  VERY_TOUGH: "bg-red-500",
};

function buildComposite(cr: ClassicRoute, legs: LegData[]): UtnoRoute {
  const waypoints: RouteWaypoint[] = [];

  // Start cabin from first coordinate of first leg
  const firstCoords = legs[0]?.route.coordinates;
  if (firstCoords?.length) {
    const [lon, lat] = firstCoords[0];
    waypoints.push({ name: legs[0].fromCabin, lat, lon });
  }

  // Each leg's last coordinate is the arrival cabin
  for (const leg of legs) {
    const coords = leg.route.coordinates;
    if (coords?.length) {
      const [lon, lat] = coords[coords.length - 1];
      waypoints.push({ name: leg.toCabin, lat, lon });
    }
  }

  const allCoords = legs.flatMap(l => l.route.coordinates ?? []);
  const hasElevations = legs.every(
    l => l.route.elevations && l.route.elevations.length === (l.route.coordinates?.length ?? 0)
  );
  const allElevations = hasElevations
    ? legs.flatMap(l => l.route.elevations!)
    : undefined;

  const totalKm = legs.reduce((s, l) => s + (l.route.distanceKm ?? 0), 0);

  return {
    id: cr.id,
    name: cr.name,
    description: cr.tagline,
    distanceKm: totalKm > 0 ? totalKm : cr.totalDistanceKm,
    durationDays: cr.durationDays,
    difficulty: cr.difficulty,
    coordinates: allCoords,
    elevations: allElevations,
    waypoints,
  };
}

export function ClassicRoutes({ onFocus, onResultsChange }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadedRoutes, setLoadedRoutes] = useState<Record<string, LoadedClassicRoute>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { trips, createTrip, saveTrip } = useTrips();
  const savedIds = new Set(trips.flatMap(t => t.routes.map(r => r.id)));

  async function handleSelect(cr: ClassicRoute) {
    setSelectedId(cr.id);

    if (loadedRoutes[cr.id]) {
      const { composite } = loadedRoutes[cr.id];
      onResultsChange?.([composite]);
      focusRoute(composite);
      return;
    }

    setLoadingId(cr.id);
    setError(null);
    try {
      const fetched = await Promise.all(
        cr.legs.map(leg => fetchRoute(leg.utnoId))
      );
      const legs: LegData[] = cr.legs.map((leg, i) => ({
        route: fetched[i],
        fromCabin: leg.fromCabin,
        toCabin: leg.toCabin,
      }));
      const composite = buildComposite(cr, legs);
      const loaded: LoadedClassicRoute = { composite, legs };
      setLoadedRoutes(prev => ({ ...prev, [cr.id]: loaded }));
      onResultsChange?.([composite]);
      focusRoute(composite);
    } catch {
      setError("Kunne ikke laste rute — sjekk nettilgang");
    } finally {
      setLoadingId(null);
    }
  }

  function focusRoute(route: UtnoRoute) {
    const coords = route.coordinates ?? [];
    if (!coords.length) return;
    const lats = coords.map(([, lat]) => lat);
    const lons = coords.map(([lon]) => lon);
    onFocus?.([
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ]);
  }

  async function handleSave(cr: ClassicRoute, e: React.MouseEvent) {
    e.stopPropagation();
    let loaded = loadedRoutes[cr.id];
    if (!loaded) {
      setLoadingId(cr.id);
      try {
        const fetched = await Promise.all(cr.legs.map(leg => fetchRoute(leg.utnoId)));
        const legs: LegData[] = cr.legs.map((leg, i) => ({
          route: fetched[i],
          fromCabin: leg.fromCabin,
          toCabin: leg.toCabin,
        }));
        const composite = buildComposite(cr, legs);
        loaded = { composite, legs };
        setLoadedRoutes(prev => ({ ...prev, [cr.id]: loaded }));
      } catch {
        setError("Kunne ikke lagre rute");
        return;
      } finally {
        setLoadingId(null);
      }
    }
    const trip = createTrip(cr.name);
    trip.routes = loaded.legs.map(leg => ({
      ...leg.route,
      name: `${leg.fromCabin} → ${leg.toCabin}`,
    }));
    saveTrip(trip);
    const coords = loaded.composite.coordinates ?? [];
    if (coords.length) {
      const lats = coords.map(([, lat]) => lat);
      const lons = coords.map(([lon]) => lon);
      downloadTilesForBounds([
        [Math.min(...lats), Math.min(...lons)],
        [Math.max(...lats), Math.max(...lons)],
      ]);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Velg en klassisk norsk hyttetur for å se alle etapper, hytter og høydeprofil på kartet.
      </p>

      {error && <p className="text-xs" style={{ color: "var(--color-error-text)" }}>{error}</p>}

      <ul className="flex flex-col gap-2">
        {CLASSIC_ROUTES.map(cr => {
          const loaded = loadedRoutes[cr.id];
          const isLoading = loadingId === cr.id;
          const isSelected = selectedId === cr.id;
          const badge = DIFFICULTY_BADGE[cr.difficulty];

          return (
            <li
              key={cr.id}
              className="p-2 text-xs cursor-pointer transition-colors"
              style={{
                background: "var(--color-surface)",
                border: isSelected ? "1px solid var(--color-brand)" : "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-text)",
              }}
              onClick={() => handleSelect(cr)}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold" style={{ color: "var(--color-text)" }}>{cr.name}</span>
                    {cr.multiDay && (
                      <span
                        className="px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          borderRadius: "var(--radius-full)",
                          background: "var(--color-brand-subtle)",
                          color: "var(--color-brand)",
                          border: "1px solid var(--color-brand-border)",
                        }}
                      >
                        {cr.durationDays} dager
                      </span>
                    )}
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>{cr.area}</p>
                  <p className="mt-0.5 leading-snug" style={{ color: "var(--color-text-secondary)" }}>{cr.tagline}</p>

                  {/* Stats row */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      {loaded
                        ? `${(loaded.composite.distanceKm ?? cr.totalDistanceKm).toFixed(1)} km`
                        : `~${cr.totalDistanceKm} km`}
                    </span>
                    {cr.durationHours && (
                      <span style={{ color: "var(--color-text-secondary)" }}>{cr.durationHours} t</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={e => handleSave(cr, e)}
                  disabled={cr.legs.some(l => savedIds.has(l.utnoId)) || isLoading}
                  className="shrink-0 self-start px-2 py-0.5 text-white font-semibold transition-opacity disabled:opacity-40"
                  style={{
                    background: cr.legs.some(l => savedIds.has(l.utnoId)) ? "var(--color-surface-raised)" : "var(--color-brand)",
                    borderRadius: "var(--radius-sm)",
                    color: cr.legs.some(l => savedIds.has(l.utnoId)) ? "var(--color-text-secondary)" : "#fff",
                  }}
                >
                  {cr.legs.some(l => savedIds.has(l.utnoId)) ? "Lagret" : isLoading ? "…" : "Lagre"}
                </button>
              </div>

              {/* Loading skeleton */}
              {isLoading && (
                <div className="mt-2 space-y-1.5">
                  <div className="h-2 w-2/3 rounded animate-pulse" style={{ background: "var(--color-surface-raised)" }} />
                  <div className="h-9 w-full rounded animate-pulse" style={{ background: "var(--color-surface-raised)" }} />
                </div>
              )}

              {/* Loaded: per-leg stages + elevation profile */}
              {loaded && (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-col gap-1">
                    {loaded.legs.map((leg, i) => {
                      const legBadge = DIFFICULTY_BADGE[leg.route.difficulty ?? ""];
                      return (
                        <div key={leg.route.id} className="flex items-start gap-1.5">
                          <div className="flex flex-col items-center pt-0.5">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                background: i === 0 ? "var(--color-success-text)" : "var(--color-brand)",
                                border: "2px solid var(--color-surface)",
                                boxShadow: "0 0 0 1px var(--color-border)",
                              }}
                            />
                            {i < loaded.legs.length - 1 && (
                              <div className="w-px flex-1 my-0.5" style={{ background: "var(--color-border)", minHeight: 12 }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="font-medium text-[11px]" style={{ color: "var(--color-text)" }}>
                                {i === 0 ? leg.fromCabin : ""}{i === 0 ? " → " : ""}{leg.toCabin}
                              </span>
                              {legBadge && (
                                <span className={`rounded-full px-1 py-0.5 text-[9px] font-medium ${legBadge.className}`}>
                                  {legBadge.label}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] flex-wrap" style={{ color: "var(--color-text-secondary)" }}>
                              {leg.route.distanceKm != null && (
                                <span>{leg.route.distanceKm.toFixed(1)} km</span>
                              )}
                              {leg.route.durationMinutes != null && leg.route.durationMinutes > 0 && (
                                <span>{Math.round(leg.route.durationMinutes / 60)} t</span>
                              )}
                              {leg.route.elevations?.length ? (() => {
                                const gain = calcElevationGain(leg.route.elevations!);
                                return (
                                  <>
                                    <span>{gain} m stigning</span>
                                    {gain > 1000 && (
                                      <span className="rounded-full px-1 py-0.5 text-[9px] font-medium bg-red-100 text-red-800">
                                        Krevende
                                      </span>
                                    )}
                                  </>
                                );
                              })() : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: "var(--color-brand)",
                          border: "2px solid var(--color-surface)",
                          boxShadow: "0 0 0 1px var(--color-border)",
                        }}
                      />
                      <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
                        {loaded.legs[loaded.legs.length - 1]?.toCabin}
                      </span>
                    </div>
                  </div>

                  {loaded.composite.elevations && loaded.composite.elevations.length > 1 && (
                    <ElevationProfile elevations={loaded.composite.elevations} />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
