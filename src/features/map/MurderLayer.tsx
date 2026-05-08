"use client";
import { useEffect, useRef, useState } from "react";
import { Circle, Marker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import murdersData from "@/data/murders.json";

interface Murder {
  id: number;
  firstName: string | null;
  fullName: string;
  dead: string;
  ageInYears: number | null;
  lat: string;
  lng: string;
  weapon: { name: string };
  image: {
    victim: { small: string | null };
    crimeScene: { medium: string | null };
  };
}

interface Cluster {
  key: string;
  lat: number;
  lng: number;
  items: Murder[];
}

const murders = murdersData as Murder[];

interface Hotspot {
  lat: number;
  lng: number;
  count: number;
}

function computeHotspots(): Hotspot[] {
  const cellSize = 0.25;
  const cells = new Map<string, { latSum: number; lngSum: number; count: number }>();
  for (const m of murders) {
    const lat = parseFloat(m.lat);
    const lng = parseFloat(m.lng);
    const key = `${Math.floor(lat / cellSize)}_${Math.floor(lng / cellSize)}`;
    const existing = cells.get(key);
    if (existing) {
      existing.latSum += lat;
      existing.lngSum += lng;
      existing.count++;
    } else {
      cells.set(key, { latSum: lat, lngSum: lng, count: 1 });
    }
  }
  return Array.from(cells.values()).map(({ latSum, lngSum, count }) => ({
    lat: latSum / count,
    lng: lngSum / count,
    count,
  }));
}

const HOTSPOTS = computeHotspots();

function makeSkullIcon(): L.DivIcon {
  return L.divIcon({
    html: `<img src="/skull.svg" width="32" height="32" style="display:block;pointer-events:none" />`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function clusterIcon(count: number): L.DivIcon {
  const size = count > 50 ? 40 : count > 10 ? 32 : 24;
  const fontSize = size < 30 ? 11 : 13;
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#b91c1c;border:2px solid #7f1d1d;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${fontSize}px;color:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35)">${count}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function clusterMurders(zoom: number): Cluster[] {
  const cellSize = 70 / Math.pow(2, zoom);
  const cells = new Map<string, { latSum: number; lngSum: number; items: Murder[] }>();

  for (const m of murders) {
    const lat = parseFloat(m.lat);
    const lng = parseFloat(m.lng);
    const key = `${Math.floor(lat / cellSize)}_${Math.floor(lng / cellSize)}`;
    const existing = cells.get(key);
    if (existing) {
      existing.latSum += lat;
      existing.lngSum += lng;
      existing.items.push(m);
    } else {
      cells.set(key, { latSum: lat, lngSum: lng, items: [m] });
    }
  }

  return Array.from(cells.entries()).map(([key, { latSum, lngSum, items }]) => ({
    key,
    lat: latSum / items.length,
    lng: lngSum / items.length,
    items,
  }));
}

interface MurderDialogProps {
  murder: Murder;
  onClose: () => void;
}

function MurderDialog({ murder, onClose }: MurderDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) dialogRef.current?.close();
  }

  const firstName = murder.firstName ?? murder.fullName.split(" ")[0];
  const victimSmall = murder.image?.victim?.small;
  const crimeSceneMedium = murder.image?.crimeScene?.medium;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleBackdropClick}
      className="m-auto w-full max-w-md rounded-xl shadow-2xl p-0 overflow-hidden backdrop:bg-black/60"
    >
      <div className="bg-red-700 text-white flex flex-col max-h-[85vh]">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-red-500 shrink-0">
          <h2 className="text-base font-bold leading-snug">
            {murder.fullName} – døde av {murder.weapon.name} den {murder.dead}.
          </h2>
          <button
            onClick={() => dialogRef.current?.close()}
            className="shrink-0 rounded-full p-1 text-red-200 hover:text-white hover:bg-red-600 transition-colors"
            aria-label="Lukk"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {victimSmall && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={victimSmall}
              alt={murder.fullName}
              className="w-20 h-20 object-cover rounded-lg border-2 border-red-400"
            />
          )}

          {murder.ageInYears != null && (
            <p className="text-red-100 text-sm font-medium">
              {firstName} ble bare {murder.ageInYears} år gammel.
            </p>
          )}

          {crimeSceneMedium && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={crimeSceneMedium}
              alt="Åstedet"
              className="w-full rounded-lg border-2 border-red-400"
            />
          )}
        </div>
      </div>
    </dialog>
  );
}

export function MurderLayer() {
  const SKULL_ICON = useRef<L.DivIcon | null>(null);
  if (!SKULL_ICON.current) SKULL_ICON.current = makeSkullIcon();
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  const [selected, setSelected] = useState<Murder | null>(null);

  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
  });

  const clusters = zoom <= 3
    ? murders.map((m) => ({ key: String(m.id), lat: parseFloat(m.lat), lng: parseFloat(m.lng), items: [m] }))
    : clusterMurders(zoom);

  return (
    <>
      {HOTSPOTS.map((spot, i) => {
        const radius = Math.min(3000 + Math.sqrt(spot.count) * 2500, 30000);
        const fillOpacity = Math.min(0.06 + Math.sqrt(spot.count) * 0.025, 0.35);
        return (
          <Circle
            key={i}
            center={[spot.lat, spot.lng]}
            radius={radius}
            pathOptions={{ stroke: false, fillColor: "#dc2626", fillOpacity }}
          />
        );
      })}

      {clusters.map((cluster) =>
        cluster.items.length === 1 ? (
          <Marker
            key={cluster.key}
            position={[cluster.lat, cluster.lng]}
            icon={SKULL_ICON.current!}
            eventHandlers={{ click: () => setSelected(cluster.items[0]) }}
          >
            <Tooltip>{cluster.items[0].fullName}</Tooltip>
          </Marker>
        ) : (
          <Marker
            key={cluster.key}
            position={[cluster.lat, cluster.lng]}
            icon={clusterIcon(cluster.items.length)}
          >
            <Tooltip>{cluster.items.length} drap</Tooltip>
          </Marker>
        )
      )}

      {selected && (
        <MurderDialog murder={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
