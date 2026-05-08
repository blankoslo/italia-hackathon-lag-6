"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Marker, Tooltip, useMap, useMapEvents } from "react-leaflet";
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
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#4f59fb;border:2px solid #2f3597;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${fontSize}px;color:#fff;box-shadow:0 1px 3px rgba(0,0,0,.5)">${count}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function makeCabinIcon(): L.DivIcon {
  const svg = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="0.5" width="31" height="31" rx="11.5" fill="#4D4D4D"/><rect x="0.5" y="0.5" width="31" height="31" rx="11.5" stroke="#D9D9D9"/><path d="M10 23H22V21H10V23ZM10 19H22V17H10V19ZM10 15H22V14.1L20.55 13H11.45L10 14.1V15ZM14.05 11H17.95L16 9.525L14.05 11ZM8 25V15.625L6.2 17L5 15.4L8 13.1V10H10V11.575L16 7L27 15.4L25.8 16.975L24 15.625V25H8ZM8 9C8 8.16667 8.29167 7.45833 8.875 6.875C9.45833 6.29167 10.1667 6 11 6C11.2833 6 11.5208 5.90417 11.7125 5.7125C11.9042 5.52083 12 5.28333 12 5H14C14 5.83333 13.7083 6.54167 13.125 7.125C12.5417 7.70833 11.8333 8 11 8C10.7167 8 10.4792 8.09583 10.2875 8.2875C10.0958 8.47917 10 8.71667 10 9H8Z" fill="#D9D9D9"/></svg>`;
  return L.divIcon({
    html: `<div style="display:block;pointer-events:none">${svg}</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

interface CabinDialogProps {
  cabin: Cabin;
  detail: CabinDetail | null;
  loading: boolean;
  onClose: () => void;
}

function CabinDialog({ cabin, detail, loading, onClose }: CabinDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const level = formatServiceLevel(detail?.serviceLevel);
  const image = detail?.images?.[0];

  const beds = detail
    ? [
        detail.bedsStaffed ? `${detail.bedsStaffed} betjente senger` : null,
        detail.bedsSelfService ? `${detail.bedsSelfService} selvbetjente senger` : null,
        detail.bedsNoService ? `${detail.bedsNoService} ubetjente senger` : null,
      ].filter(Boolean)
    : [];

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleBackdropClick}
      className="m-auto w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl p-0 overflow-hidden backdrop:bg-black/60"
      style={{ background: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <div
          className="flex items-start justify-between gap-3 px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <h2 className="text-lg font-bold leading-snug" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>
            {cabin.name}
          </h2>
          <button
            onClick={() => dialogRef.current?.close()}
            className="shrink-0 rounded-full p-1 transition-colors"
            style={{ color: "var(--color-text-secondary)" }}
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
            <p className="text-sm animate-pulse" style={{ color: "var(--color-text-secondary)" }}>
              Laster detaljer…
            </p>
          )}

          {!loading && detail && (
            <>
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.url}
                  alt={image.alt ?? detail.name}
                  className="w-full h-52 object-cover rounded-xl"
                />
              )}

              {level && (
                <span
                  className="inline-block text-xs font-semibold px-3 py-1"
                  style={{
                    background: "var(--color-brand-subtle)",
                    color: "var(--color-brand)",
                    border: "1px solid var(--color-brand-border)",
                    borderRadius: "var(--radius-full)",
                  }}
                >
                  {level}
                </span>
              )}

              {beds.length > 0 && (
                <ul className="text-sm space-y-1" style={{ color: "var(--color-text-secondary)" }}>
                  {beds.map((b) => (
                    <li key={b} className="flex items-center gap-1.5">
                      <span style={{ color: "var(--color-brand)" }}>&#9679;</span>
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              {detail.description ? (
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--color-text-secondary)" }}>
                  {detail.description.replace(/<\/?p>/g, "").trim()}
                </p>
              ) : (
                <p className="text-sm italic" style={{ color: "var(--color-text-disabled)" }}>
                  Ingen beskrivelse tilgjengelig.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

async function loadCabinsForViewport(map: L.Map, signal: AbortSignal): Promise<Cabin[]> {
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
  const [detailCache, setDetailCache] = useState<Map<string, CabinDetail>>(new Map());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedCabin, setSelectedCabin] = useState<Cabin | null>(null);
  const cabinIconRef = useRef<L.DivIcon | null>(null);
  if (!cabinIconRef.current) cabinIconRef.current = makeCabinIcon();

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
            <Marker
              key={cabin.id}
              position={[cabin.lat, cabin.lon]}
              icon={cabinIconRef.current!}
              eventHandlers={{ click: () => openCabin(cabin) }}
            >
              <Tooltip>{cabin.name}</Tooltip>
            </Marker>
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
