"use client";
import { useEffect, useRef } from "react";
import { MapContainer, Polyline, Popup, useMap } from "react-leaflet";
import { OfflineTileLayer } from "./OfflineTileLayer";
import { CabinLayer } from "./CabinLayer";
import { useTrips } from "@/context/TripContext";
import type { Location } from "@/context/LocationContext";
import type { Trip, UtnoRoute } from "@/types/trip";

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
  searchResults?: UtnoRoute[];
  onSaveRoute?: (route: UtnoRoute) => void;
}

export function MapViewClient({
  location,
  trips = [],
  focusBounds = null,
  searchResults = [],
  onSaveRoute,
}: Props) {
  const { trips: savedTrips } = useTrips();
  const savedIds = new Set(savedTrips.flatMap((t) => t.routes.map((r) => r.id)));
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearClose() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }

  return (
    <MapContainer
      center={[65.0, 15.0]}
      zoom={5}
      style={{ height: "100%", width: "100%" }}
    >
      <OfflineTileLayer />
      <CabinLayer />
      <FlyToLocation location={location} />
      <FitBounds bounds={focusBounds} />

      {/* Saved trip routes — green */}
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

      {/* Search result routes — blue, with hover popup */}
      {searchResults
        .filter((r) => r.coordinates && r.coordinates.length > 0)
        .map((route) => (
          <Polyline
            key={`search-${route.id}`}
            positions={route.coordinates!.map(([lon, lat]) => [lat, lon])}
            pathOptions={{ color: "#2563eb", weight: 3, opacity: 0.7 }}
            eventHandlers={{
              mouseover: (e) => {
                clearClose();
                e.target.setStyle({ weight: 6, opacity: 1 });
                e.target.openPopup(e.latlng);
              },
              mouseout: (e) => {
                const polyline = e.target;
                polyline.setStyle({ weight: 3, opacity: 0.7 });
                const el = polyline.getPopup()?.getElement();

                const doClose = () => { polyline.closePopup(); closeTimer.current = null; };

                if (el) {
                  const onEnter = () => {
                    clearClose();
                    el.removeEventListener("mouseenter", onEnter);
                    el.addEventListener("mouseleave", doClose, { once: true });
                  };
                  el.addEventListener("mouseenter", onEnter);
                  closeTimer.current = setTimeout(() => {
                    el.removeEventListener("mouseenter", onEnter);
                    doClose();
                  }, 250);
                } else {
                  closeTimer.current = setTimeout(doClose, 250);
                }
              },
            }}
          >
            <Popup>
              <div className="text-sm min-w-[140px]">
                <p className="font-medium mb-1">{route.name}</p>
                <button
                  onClick={() => onSaveRoute?.(route)}
                  disabled={savedIds.has(route.id)}
                  className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white disabled:bg-gray-300"
                >
                  {savedIds.has(route.id) ? "Lagret" : "Lagre"}
                </button>
              </div>
            </Popup>
          </Polyline>
        ))}
    </MapContainer>
  );
}
