"use client";
import { useEffect } from "react";
import { MapContainer, Polyline, useMap } from "react-leaflet";
import { OfflineTileLayer } from "./OfflineTileLayer";
import type { Location } from "@/context/LocationContext";
import type { Trip } from "@/types/trip";

type LatLngBounds = [[number, number], [number, number]];

function FlyToLocation({ location }: { location: Location | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) map.flyTo([location.lat, location.lon], 12, { duration: 1.5 });
  }, [location, map]);
  return null;
}

function FitBounds({ bounds }: { bounds: LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [40, 40] });
  }, [bounds, map]);
  return null;
}

interface Props {
  location: Location | null;
  trips?: Trip[];
  focusBounds?: LatLngBounds | null;
}

export function MapViewClient({ location, trips = [], focusBounds = null }: Props) {
  return (
    <MapContainer
      center={[65.0, 15.0]}
      zoom={5}
      style={{ height: "100%", width: "100%" }}
    >
      <OfflineTileLayer />
      <FlyToLocation location={location} />
      <FitBounds bounds={focusBounds} />
      {trips.flatMap((trip) =>
        trip.routes
          .filter((r) => r.coordinates && r.coordinates.length > 0)
          .map((route) => (
            <Polyline
              key={route.id}
              positions={route.coordinates!.map(([lon, lat]) => [lat, lon])}
              pathOptions={{ color: "#16a34a", weight: 3, opacity: 0.8 }}
            />
          ))
      )}
    </MapContainer>
  );
}
