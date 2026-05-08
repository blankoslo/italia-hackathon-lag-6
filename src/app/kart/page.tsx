"use client";
import dynamic from "next/dynamic";
import { LocationSearch } from "@/features/map/LocationSearch";
import { useLocation } from "@/context/LocationContext";

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
      <main className="relative flex-1 min-h-0">
        <div className="absolute inset-0">
          <MapViewClient location={location} />
        </div>
      </main>
    </div>
  );
}
