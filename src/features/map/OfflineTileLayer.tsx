"use client";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { getTile } from "./tileStore";

const TILE_BASE =
  "https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator";

class OfflineGridLayer extends L.GridLayer {
  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const img = document.createElement("img");
    img.setAttribute("role", "presentation");

    const key = `${coords.z}/${coords.y}/${coords.x}`;
    const networkUrl = `${TILE_BASE}/${coords.z}/${coords.y}/${coords.x}.png`;

    getTile(key).then((cached) => {
      if (cached) {
        const blobUrl = URL.createObjectURL(
          new Blob([cached], { type: "image/png" })
        );
        img.onload = () => { done(undefined, img); URL.revokeObjectURL(blobUrl); };
        img.onerror = () => done(new Error("cached tile failed"), img);
        img.src = blobUrl;
      } else {
        img.onload = () => done(undefined, img);
        img.onerror = () => done(new Error("tile unavailable"), img);
        img.src = networkUrl;
      }
    });

    return img;
  }
}

export function OfflineTileLayer() {
  const map = useMap();

  useEffect(() => {
    const layer = new OfflineGridLayer({
      attribution: "© Kartverket",
      maxZoom: 18,
      tileSize: 256,
    });
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map]);

  return null;
}
