"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CircleMarker, Marker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

interface Cabin {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

interface Cluster {
  key: string;
  lat: number;
  lon: number;
  count: number;
}

function clusterCabins(cabins: Cabin[], zoom: number): Cluster[] {
  // Cell size in degrees scales with zoom so clusters stay ~50px wide
  const cellSize = 70 / Math.pow(2, zoom);
  const cells = new Map<string, { latSum: number; lonSum: number; count: number }>();

  for (const cabin of cabins) {
    const key = `${Math.floor(cabin.lat / cellSize)}_${Math.floor(cabin.lon / cellSize)}`;
    const existing = cells.get(key);
    if (existing) {
      existing.latSum += cabin.lat;
      existing.lonSum += cabin.lon;
      existing.count++;
    } else {
      cells.set(key, { latSum: cabin.lat, lonSum: cabin.lon, count: 1 });
    }
  }

  return Array.from(cells.entries()).map(([key, { latSum, lonSum, count }]) => ({
    key,
    lat: latSum / count,
    lon: lonSum / count,
    count,
  }));
}

function clusterIcon(count: number): L.DivIcon {
  const size = count > 20 ? 40 : count > 5 ? 32 : 24;
  const fontSize = size < 30 ? 11 : 13;
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#f59e0b;border:2px solid #92400e;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${fontSize}px;color:#1c1917;box-shadow:0 1px 3px rgba(0,0,0,.35)">${count}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function CabinLayer() {
  const map = useMap();
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [zoom, setZoom] = useState(() => map.getZoom());
  const abortRef = useRef<AbortController | null>(null);

  const fetchCabins = useCallback(async () => {
    const center = map.getCenter();
    const bounds = map.getBounds();
    const latSpan = bounds.getNorth() - bounds.getSouth();
    const lonSpan = bounds.getEast() - bounds.getWest();
    const radiusDeg = Math.sqrt(latSpan * latSpan + lonSpan * lonSpan) / 2;
    const radiusMeters = Math.min(Math.round(radiusDeg * 111_000), 150_000);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(
        `/api/cabins?lat=${center.lat.toFixed(4)}&lon=${center.lng.toFixed(4)}&radius=${radiusMeters}`,
        { signal: controller.signal }
      );
      if (res.ok) setCabins(await res.json());
    } catch {
      // aborted or network error — ignore
    }
  }, [map]);

  useEffect(() => {
    fetchCabins();
  }, [fetchCabins]);

  useMapEvents({
    moveend() {
      setZoom(map.getZoom());
      fetchCabins();
    },
    zoomend() {
      setZoom(map.getZoom());
      fetchCabins();
    },
  });

  if (zoom >= 10) {
    return (
      <>
        {cabins.map((cabin) => (
          <CircleMarker
            key={cabin.id}
            center={[cabin.lat, cabin.lon]}
            radius={7}
            pathOptions={{
              color: "#92400e",
              fillColor: "#f59e0b",
              fillOpacity: 0.9,
              weight: 1.5,
            }}
          >
            <Tooltip>{cabin.name}</Tooltip>
          </CircleMarker>
        ))}
      </>
    );
  }

  const clusters = clusterCabins(cabins, zoom);
  return (
    <>
      {clusters.map((cluster) => (
        <Marker
          key={cluster.key}
          position={[cluster.lat, cluster.lon]}
          icon={clusterIcon(cluster.count)}
        >
          <Tooltip>
            {cluster.count} hytte{cluster.count !== 1 ? "r" : ""}
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}
