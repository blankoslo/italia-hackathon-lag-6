"use client";
import { useState } from "react";
import { searchRoutes, fetchRoute } from "./utno";
import { useTrips } from "@/context/TripContext";
import { downloadTilesForBounds } from "@/features/map/downloadTiles";
import type { UtnoRoute, Trip } from "@/types/trip";

type LatLngBounds = [[number, number], [number, number]];

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
}

export function RouteSearch({ onFocus }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UtnoRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { trips, createTrip, saveTrip, deleteTrip } = useTrips();

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { routes } = await searchRoutes(query);
      setResults(routes);
    } catch {
      setError("Søk feilet — sjekk nettilgang");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(route: UtnoRoute) {
    const full = await fetchRoute(route.id);
    const trip = createTrip(route.name);
    trip.routes = [full];

    const coords = full.coordinates ?? [];
    if (coords.length) {
      const centerLat = coords.reduce((s, [, lat]) => s + lat, 0) / coords.length;
      const centerLon = coords.reduce((s, [lon]) => s + lon, 0) / coords.length;

      try {
        const res = await fetch(
          `/api/cabins?lat=${centerLat.toFixed(4)}&lon=${centerLon.toFixed(4)}&radius=25000`
        );
        if (res.ok) {
          const nearby = await res.json();
          trip.cabins = nearby.slice(0, 10);
        }
      } catch {
        // non-critical — save trip without cabins
      }

      const lats = coords.map(([, lat]) => lat);
      const lons = coords.map(([lon]) => lon);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lats), Math.min(...lons)],
        [Math.max(...lats), Math.max(...lons)],
      ];
      downloadTilesForBounds(bounds);
    }

    saveTrip(trip);
  }

  function handleFocus(trip: Trip) {
    const coords = trip.routes.flatMap((r) => r.coordinates ?? []);
    const bounds = boundsFromCoordinates(coords);
    if (bounds) onFocus?.(bounds);
  }

  const savedIds = new Set(trips.flatMap((t) => t.routes.map((r) => r.id)));

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søk turruter på ut.no…"
          className="flex-1 rounded border px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          {loading ? "…" : "Søk"}
        </button>
      </form>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {results.length > 0 && (
        <ul className="flex flex-col gap-1">
          {results.map((route) => (
            <li key={route.id} className="flex items-start justify-between gap-2 rounded bg-gray-50 p-2 text-xs">
              <div>
                <p className="font-medium">{route.name}</p>
                <p className="text-gray-500">
                  {route.distanceKm != null && `${route.distanceKm.toFixed(1)} km`}
                  {route.difficulty && ` · ${route.difficulty}`}
                </p>
              </div>
              <button
                onClick={() => handleSave(route)}
                disabled={savedIds.has(route.id)}
                className="shrink-0 rounded bg-blue-600 px-2 py-0.5 text-white disabled:bg-gray-300"
              >
                {savedIds.has(route.id) ? "Lagret" : "Lagre"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {trips.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-gray-600">Mine turer (lagret offline)</p>
          <ul className="flex flex-col gap-1">
            {trips.map((trip) => (
              <li
                key={trip.id}
                className="flex items-center justify-between rounded bg-green-50 px-2 py-1 text-xs cursor-pointer hover:bg-green-100"
                onClick={() => handleFocus(trip)}
              >
                <span>{trip.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTrip(trip.id); }}
                  className="text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
