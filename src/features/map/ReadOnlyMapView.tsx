"use client";
import { useEffect } from "react";
import { MapContainer, Polyline, useMap } from "react-leaflet";
import { OfflineTileLayer } from "./OfflineTileLayer";
import type { UtnoRoute } from "@/types/trip";

function FitRoutes({ routes }: { routes: UtnoRoute[] }) {
  const map = useMap();
  useEffect(() => {
    const coords = routes.flatMap((r) => r.coordinates ?? []);
    if (!coords.length) return;
    const lats = coords.map(([, lat]) => lat);
    const lons = coords.map(([lon]) => lon);
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]],
      { padding: [32, 32] }
    );
  }, [routes, map]);
  return null;
}

export function ReadOnlyMapView({ routes }: { routes: UtnoRoute[] }) {
  return (
    <MapContainer center={[65.0, 15.0]} zoom={5} style={{ height: "100%", width: "100%" }}>
      <OfflineTileLayer />
      <FitRoutes routes={routes} />
      {routes
        .filter((r) => r.coordinates?.length)
        .map((route) => (
          <Polyline
            key={route.id}
            positions={route.coordinates!.map(([lon, lat]) => [lat, lon])}
            pathOptions={{ color: "#16a34a", weight: 4, opacity: 0.85 }}
          />
        ))}
    </MapContainer>
  );
}
