"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Location } from "@/context/LocationContext";

function FlyToLocation({ location }: { location: Location | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lon], 12, { duration: 1.5 });
    }
  }, [location, map]);
  return null;
}

interface Props {
  location: Location | null;
}

export function MapViewClient({ location }: Props) {
  return (
    <MapContainer
      center={[65.0, 15.0]}
      zoom={5}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png"
        attribution="© Kartverket"
      />
      <FlyToLocation location={location} />
    </MapContainer>
  );
}
