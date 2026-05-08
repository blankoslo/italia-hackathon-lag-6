"use client";
import { useState } from "react";
import { CLASSIC_ROUTES, DIFFICULTY_BADGE, type ClassicRoute } from "@/data/classicRoutes";
import { fetchRoute } from "./utno";
import { useTrips } from "@/context/TripContext";
import { downloadTilesForBounds } from "@/features/map/downloadTiles";
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
      <div className="flex justify-between text-[10px] text-gray-400 leading-none mt-0.5">
        <span>{minEl.toFixed(0)} moh.</span>
        <span className="text-center text-gray-500">Høydeprofil</span>
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
    trip.routes = [loaded.composite];
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
      <p className="text-xs text-gray-500">
        Velg en klassisk norsk hyttetur for å se alle etapper, hytter og høydeprofil på kartet.
      </p>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <ul className="flex flex-col gap-2">
        {CLASSIC_ROUTES.map(cr => {
          const loaded = loadedRoutes[cr.id];
          const isLoading = loadingId === cr.id;
          const isSelected = selectedId === cr.id;
          const badge = DIFFICULTY_BADGE[cr.difficulty];
          const dotColor = DIFFICULTY_COLORS[cr.difficulty] ?? "bg-gray-400";

          return (
            <li
              key={cr.id}
              className={`rounded border bg-white p-2 text-xs cursor-pointer transition-colors ${
                isSelected ? "border-blue-500 shadow-sm" : "hover:border-blue-300"
              }`}
              onClick={() => handleSelect(cr)}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold">{cr.name}</span>
                    {cr.multiDay && (
                      <span className="rounded-full bg-purple-100 text-purple-800 px-1.5 py-0.5 text-[10px] font-medium">
                        {cr.durationDays} dager
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-[11px]">{cr.area}</p>
                  <p className="text-gray-600 mt-0.5 leading-snug">{cr.tagline}</p>

                  {/* Stats row */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="text-gray-400">
                      {loaded
                        ? `${(loaded.composite.distanceKm ?? cr.totalDistanceKm).toFixed(1)} km`
                        : `~${cr.totalDistanceKm} km`}
                    </span>
                    {cr.durationHours && <span className="text-gray-400">{cr.durationHours} t</span>}
                  </div>
                </div>

                <button
                  onClick={e => handleSave(cr, e)}
                  disabled={savedIds.has(cr.id) || isLoading}
                  className="shrink-0 self-start rounded bg-blue-600 px-2 py-0.5 text-white disabled:bg-gray-300 hover:bg-blue-700"
                >
                  {savedIds.has(cr.id) ? "Lagret" : isLoading ? "…" : "Lagre"}
                </button>
              </div>

              {/* Loading skeleton */}
              {isLoading && (
                <div className="mt-2 space-y-1.5">
                  <div className="h-2 w-2/3 rounded bg-gray-100 animate-pulse" />
                  <div className="h-9 w-full rounded bg-gray-100 animate-pulse" />
                </div>
              )}

              {/* Loaded: per-leg stages + elevation profile */}
              {loaded && (
                <div className="mt-2 space-y-2">
                  {/* Cabin waypoint chain */}
                  <div className="flex flex-col gap-1">
                    {loaded.legs.map((leg, i) => {
                      const legBadge = DIFFICULTY_BADGE[leg.route.difficulty ?? ""] ;
                      return (
                        <div key={leg.route.id} className="flex items-start gap-1.5">
                          <div className="flex flex-col items-center pt-0.5">
                            <div className={`w-2 h-2 rounded-full border-2 border-white ring-1 ring-gray-300 ${i === 0 ? "bg-green-500" : dotColor}`} />
                            {i < loaded.legs.length - 1 && (
                              <div className="w-px flex-1 bg-gray-200 my-0.5" style={{ minHeight: 12 }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="font-medium text-[11px]">
                                {i === 0 ? leg.fromCabin : ""}{i === 0 ? " → " : ""}{leg.toCabin}
                              </span>
                              {legBadge && (
                                <span className={`rounded-full px-1 py-0.5 text-[9px] font-medium ${legBadge.className}`}>
                                  {legBadge.label}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                              {leg.route.distanceKm != null && (
                                <span>{leg.route.distanceKm.toFixed(1)} km</span>
                              )}
                              {leg.route.durationMinutes != null && leg.route.durationMinutes > 0 && (
                                <span>{Math.round(leg.route.durationMinutes / 60)} t</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {/* Final destination dot */}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full border-2 border-white ring-1 ring-gray-300 ${dotColor}`} />
                      <span className="text-[11px] text-gray-500">
                        {loaded.legs[loaded.legs.length - 1]?.toCabin}
                      </span>
                    </div>
                  </div>

                  {/* Elevation profile */}
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
