"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { LocationSearch } from "@/features/map/LocationSearch";
import { RouteSearch } from "@/features/trips/RouteSearch";
import { useLocation } from "@/context/LocationContext";
import { useTrips } from "@/context/TripContext";

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
  const { trips } = useTrips();
  const [focusBounds, setFocusBounds] = useState<LatLngBounds | null>(null);

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
      </header>
      <main className="relative flex-1 min-h-0 flex">
        <aside className="w-72 shrink-0 overflow-y-auto border-r bg-white p-3">
          <RouteSearch onFocus={setFocusBounds} />
        </aside>
        <div className="relative flex-1">
          <div className="absolute inset-0">
            <MapViewClient
              location={location}
              trips={trips}
              focusBounds={focusBounds}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
