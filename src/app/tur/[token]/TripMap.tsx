"use client";
import dynamic from "next/dynamic";
import type { UtnoRoute } from "@/types/trip";

const ReadOnlyMapView = dynamic(
  () => import("@/features/map/ReadOnlyMapView").then((m) => m.ReadOnlyMapView),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-gray-200" /> }
);

export function TripMap({ routes }: { routes: UtnoRoute[] }) {
  return <ReadOnlyMapView routes={routes} />;
}
