import { getTile, putTile } from "./tileStore";

const TILE_BASE =
  "https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator";

const MIN_ZOOM = 8;
const MAX_ZOOM = 13;

function lon2x(lon: number, z: number) {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}

function lat2y(lat: number, z: number) {
  const r = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z
  );
}

async function fetchAndCache(z: number, y: number, x: number): Promise<void> {
  const key = `${z}/${y}/${x}`;
  if (await getTile(key)) return; // already cached
  const res = await fetch(`${TILE_BASE}/${z}/${y}/${x}.png`);
  if (!res.ok) return;
  await putTile(key, await res.arrayBuffer());
}

export async function downloadTilesForBounds(
  bounds: [[number, number], [number, number]]
): Promise<void> {
  if (!navigator.onLine) return;

  const [[minLat, minLon], [maxLat, maxLon]] = bounds;

  for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
    const x0 = lon2x(minLon, z);
    const x1 = lon2x(maxLon, z);
    const y0 = lat2y(maxLat, z); // lat is inverted in tile coords
    const y1 = lat2y(minLat, z);

    const fetches: Promise<void>[] = [];
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        fetches.push(fetchAndCache(z, y, x));
      }
    }
    // Download zoom level by zoom level, parallel within each level
    await Promise.allSettled(fetches);
  }
}
