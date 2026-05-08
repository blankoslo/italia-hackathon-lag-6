import type { UtnoRoute } from "@/types/trip";

interface SearchResult {
  routes: UtnoRoute[];
}

export async function searchRoutes(
  query: string,
  { limit = 10 }: { limit?: number } = {}
): Promise<SearchResult> {
  if (!query.trim()) return { routes: [] };

  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const res = await fetch(`/api/routes?${params}`);
  if (!res.ok) throw new Error(`Route search failed: ${res.status}`);

  return res.json();
}

export async function fetchRoute(id: string): Promise<UtnoRoute> {
  const res = await fetch(`/api/routes/${id}`);
  if (!res.ok) throw new Error(`Route fetch failed: ${res.status}`);
  return res.json();
}
