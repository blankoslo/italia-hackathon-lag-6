import type { Place } from "./types";

export async function searchPlaces(query: string): Promise<Place[]> {
  if (!query.trim()) return [];

  const res = await fetch(`/api/places?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);

  return res.json();
}
