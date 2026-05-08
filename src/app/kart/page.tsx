"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { LocationSearch } from "@/features/map/LocationSearch";
import { RouteSearch } from "@/features/trips/RouteSearch";
import { useLocation } from "@/context/LocationContext";
import { useTrips } from "@/context/TripContext";
import { downloadTilesForBounds } from "@/features/map/downloadTiles";
import type { UtnoRoute } from "@/types/trip";

type LatLngBounds = [[number, number], [number, number]];

const MapViewClient = dynamic(
  () => import("@/features/map/MapViewClient").then((m) => m.MapViewClient),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse bg-gray-200" />
    ),
  }
);

export default function KartPage() {
  const { location } = useLocation();
  const { trips, createTrip, saveTrip } = useTrips();
  const [focusBounds, setFocusBounds] = useState<LatLngBounds | null>(null);
  const [searchResults, setSearchResults] = useState<UtnoRoute[]>([]);
  const [showMurders, setShowMurders] = useState(false);

  async function saveRouteFromMap(route: UtnoRoute) {
    const trip = createTrip(route.name);
    trip.routes = [route];
    saveTrip(trip);
    const coords = route.coordinates ?? [];
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
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 bg-white px-4 py-3 shadow-sm">
        <h1 className="text-lg font-bold whitespace-nowrap">Friluftskompis</h1>
        <div className="w-80">
          <LocationSearch />
        </div>
        {location && (
          <span className="text-xs text-gray-500">
            {location.name} &mdash; {location.lat.toFixed(4)}°N,{" "}
            {location.lon.toFixed(4)}°E
          </span>
        )}
        <button
          onClick={() => setShowMurders((v) => !v)}
          className={`ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            showMurders
              ? "border-red-700 bg-red-700 text-white"
              : "border-gray-300 bg-white text-gray-600 hover:border-red-400 hover:text-red-600"
          }`}
        >
          <img src="/skull.svg" width={16} height={16} alt="" />
          Drap
        </button>
      </header>
      <main className="relative flex-1 min-h-0 flex">
        <aside className="w-72 shrink-0 overflow-y-auto border-r bg-white p-3">
          <RouteSearch
            onFocus={setFocusBounds}
            onResultsChange={setSearchResults}
          />
        </aside>
        <div className="relative flex-1">
          <div className="absolute inset-0">
            <MapViewClient
              location={location}
              trips={trips}
              focusBounds={focusBounds}
              searchResults={searchResults}
              onSaveRoute={saveRouteFromMap}
              showMurders={showMurders}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
