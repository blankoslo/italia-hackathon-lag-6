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
  const svg = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="0.5" width="31" height="31" rx="11.5" fill="#4D4D4D"/><rect x="0.5" y="0.5" width="31" height="31" rx="11.5" stroke="#D9D9D9"/><path d="M10 26V21.75C9.35 21.4667 8.77917 21.0875 8.2875 20.6125C7.79583 20.1375 7.37917 19.6 7.0375 19C6.69583 18.4 6.4375 17.7583 6.2625 17.075C6.0875 16.3917 6 15.7 6 15C6 12.3667 6.93333 10.2083 8.8 8.525C10.6667 6.84167 13.0667 6 16 6C18.9333 6 21.3333 6.84167 23.2 8.525C25.0667 10.2083 26 12.3667 26 15C26 15.7 25.9125 16.3917 25.7375 17.075C25.5625 17.7583 25.3042 18.4 24.9625 19C24.6208 19.6 24.2042 20.1375 23.7125 20.6125C23.2208 21.0875 22.65 21.4667 22 21.75V26H10ZM12 24H13V22H15V24H17V22H19V24H20V20.45C20.6333 20.3 21.1958 20.05 21.6875 19.7C22.1792 19.35 22.5958 18.9333 22.9375 18.45C23.2792 17.9667 23.5417 17.4333 23.725 16.85C23.9083 16.2667 24 15.65 24 15C24 12.9167 23.2625 11.2292 21.7875 9.9375C20.3125 8.64583 18.3833 8 16 8C13.6167 8 11.6875 8.64583 10.2125 9.9375C8.7375 11.2292 8 12.9167 8 15C8 15.65 8.09167 16.2667 8.275 16.85C8.45833 17.4333 8.72083 17.9667 9.0625 18.45C9.40417 18.9333 9.825 19.35 10.325 19.7C10.825 20.05 11.3833 20.3 12 20.45V24ZM14.5 19H17.5L16 16L14.5 19ZM12.5 17C13.05 17 13.5208 16.8042 13.9125 16.4125C14.3042 16.0208 14.5 15.55 14.5 15C14.5 14.45 14.3042 13.9792 13.9125 13.5875C13.5208 13.1958 13.05 13 12.5 13C11.95 13 11.4792 13.1958 11.0875 13.5875C10.6958 13.9792 10.5 14.45 10.5 15C10.5 15.55 10.6958 16.0208 11.0875 16.4125C11.4792 16.8042 11.95 17 12.5 17ZM19.5 17C20.05 17 20.5208 16.8042 20.9125 16.4125C21.3042 16.0208 21.5 15.55 21.5 15C21.5 14.45 21.3042 13.9792 20.9125 13.5875C20.5208 13.1958 20.05 13 19.5 13C18.95 13 18.4792 13.1958 18.0875 13.5875C17.6958 13.9792 17.5 14.45 17.5 15C17.5 15.55 17.6958 16.0208 18.0875 16.4125C18.4792 16.8042 18.95 17 19.5 17Z" fill="#D9D9D9"/></svg>`;
  return L.divIcon({
    html: `<div style="display:block;pointer-events:none">${svg}</div>`,
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
