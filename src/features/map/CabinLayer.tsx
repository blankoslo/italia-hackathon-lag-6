"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CircleMarker,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { CabinDetail } from "@/app/api/cabins/[id]/route";

interface Cabin {
  id: string;
  name: string;
  lat: number;
  lon: number;
  serviceLevel?: string;
}

interface Cluster {
  key: string;
  lat: number;
  lon: number;
  count: number;
}

// Covers both the list endpoint (Norwegian names) and detail endpoint (English keys)
const SERVICE_LEVELS: Record<string, string> = {
  STAFFED: "Betjent",
  SELF_SERVICE: "Selvbetjent",
  NO_SERVICE: "Ubetjent",
  RENTAL: "Utleiehytte",
  SELVBETJENT: "Selvbetjent",
  BETJENT: "Betjent",
  UBETJENT: "Ubetjent",
  PRIVAT: "Privat",
  DAGSHYTTE: "Dagshytte",
  NØDBU: "Nødbu",
  UTLEIEHYTTE: "Utleiehytte",
  SERVERING: "Med servering",
  ÅPEN: "Åpen uten betjening",
};

function formatServiceLevel(raw?: string): string | null {
  if (!raw) return null;
  return SERVICE_LEVELS[raw.toUpperCase()] ?? raw;
}

function clusterCabins(cabins: Cabin[], zoom: number): Cluster[] {
  const cellSize = 70 / Math.pow(2, zoom);
  const cells = new Map<
    string,
    { latSum: number; lonSum: number; count: number }
  >();

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

  return Array.from(cells.entries()).map(
    ([key, { latSum, lonSum, count }]) => ({
      key,
      lat: latSum / count,
      lon: lonSum / count,
      count,
    }),
  );
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

interface CabinDialogProps {
  cabin: Cabin;
  detail: CabinDetail | null;
  loading: boolean;
  onClose: () => void;
}

function CabinDialog({ cabin, detail, loading, onClose }: CabinDialogProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const level = formatServiceLevel(detail?.serviceLevel);
  const image = detail?.images?.[0];

  const beds = detail
    ? [
        detail.bedsStaffed ? `${detail.bedsStaffed} betjente senger` : null,
        detail.bedsSelfService
          ? `${detail.bedsSelfService} selvbetjente senger`
          : null,
        detail.bedsNoService
          ? `${detail.bedsNoService} ubetjente senger`
          : null,
      ].filter(Boolean)
    : [];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 leading-snug">
            {cabin.name}
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Lukk"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {loading && (
            <p className="text-sm text-gray-500 animate-pulse">
              Laster detaljer…
            </p>
          )}

          {!loading && detail && (
            <>
              {/* Image */}
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.url}
                  alt={image.alt ?? detail.name}
                  className="w-full h-52 object-cover rounded-lg"
                />
              )}

              {/* Service level badge */}
              {level && (
                <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {level}
                </span>
              )}

              {/* Bed counts */}
              {beds.length > 0 && (
                <ul className="text-sm text-gray-600 space-y-1">
                  {beds.map((b) => (
                    <li key={b} className="flex items-center gap-1.5">
                      <span className="text-amber-600">&#9679;</span>
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              {/* Full description */}
              {detail.description ? (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {detail.description
                    .replace("<p>", "")
                    .replace("</p>", "")
                    .trim()}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  Ingen beskrivelse tilgjengelig.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Pure helper — no state, returns data so callers decide when to setState
async function loadCabinsForViewport(
  map: L.Map,
  signal: AbortSignal,
): Promise<Cabin[]> {
  const center = map.getCenter();
  const bounds = map.getBounds();
  const latSpan = bounds.getNorth() - bounds.getSouth();
  const lonSpan = bounds.getEast() - bounds.getWest();
  const radiusDeg = Math.sqrt(latSpan * latSpan + lonSpan * lonSpan) / 2;
  const radiusMeters = Math.min(Math.round(radiusDeg * 111_000), 150_000);
  const res = await fetch(
    `/api/cabins?lat=${center.lat.toFixed(4)}&lon=${center.lng.toFixed(4)}&radius=${radiusMeters}`,
    { signal },
  );
  if (!res.ok) return [];
  return res.json();
}

export function CabinLayer() {
  const map = useMap();
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [zoom, setZoom] = useState(() => map.getZoom());
  const abortRef = useRef<AbortController | null>(null);
  const [detailCache, setDetailCache] = useState<Map<string, CabinDetail>>(
    new Map(),
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedCabin, setSelectedCabin] = useState<Cabin | null>(null);

  // setState lives in the .then() callback, not synchronously in the effect body
  const refetch = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    loadCabinsForViewport(map, controller.signal)
      .then(setCabins)
      .catch(() => {});
  }, [map]);

  const openCabin = useCallback(
    async (cabin: Cabin) => {
      setSelectedCabin(cabin);
      if (detailCache.has(cabin.id)) return;
      setLoadingId(cabin.id);
      try {
        const numericId = cabin.id.replace("cabin-", "");
        const res = await fetch(`/api/cabins/${numericId}`);
        if (res.ok) {
          const detail: CabinDetail = await res.json();
          setDetailCache((prev) => new Map(prev).set(cabin.id, detail));
        }
      } finally {
        setLoadingId((prev) => (prev === cabin.id ? null : prev));
      }
    },
    [detailCache],
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  useMapEvents({
    moveend() {
      setZoom(map.getZoom());
      refetch();
    },
    zoomend() {
      setZoom(map.getZoom());
      refetch();
    },
  });

  const closeDialog = useCallback(() => setSelectedCabin(null), []);

  return (
    <>
      {zoom >= 10
        ? cabins.map((cabin) => (
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
              eventHandlers={{ click: () => openCabin(cabin) }}
            >
              <Tooltip>{cabin.name}</Tooltip>
            </CircleMarker>
          ))
        : clusterCabins(cabins, zoom).map((cluster) => (
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

      {selectedCabin && (
        <CabinDialog
          cabin={selectedCabin}
          detail={detailCache.get(selectedCabin.id) ?? null}
          loading={loadingId === selectedCabin.id}
          onClose={closeDialog}
        />
      )}
    </>
  );
}
