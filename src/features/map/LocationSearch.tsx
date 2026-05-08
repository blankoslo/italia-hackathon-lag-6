"use client";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "@/context/LocationContext";
import type { SearchResult } from "@/app/api/search/route";

const CATEGORY_LABEL: Record<SearchResult["category"], string> = {
  fjelltopp: "🏔 Fjelltopp",
  område: "🗺 Område",
  hytte: "🏠 Hytte",
  sted: "📍 Sted",
};

export function LocationSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setLocation } = useLocation();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justSelectedRef = useRef(false);

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (query.trim().length < 3) {
        setResults([]);
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error(`${res.status}`);
        setResults(await res.json());
      } catch {
        setResults([]);
        setError("Søk feilet");
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function handleSelect(result: SearchResult) {
    justSelectedRef.current = true;
    setLocation({ lat: result.lat, lon: result.lon, name: result.name });
    setQuery(result.name);
    setResults([]);
  }

  function handleBlur() {
    setTimeout(() => setResults([]), 150);
  }

  const grouped = results.reduce<Partial<Record<SearchResult["category"], SearchResult[]>>>(
    (acc, r) => ({ ...acc, [r.category]: [...(acc[r.category] ?? []), r] }),
    {}
  );
  const categoryOrder: SearchResult["category"][] = ["område", "fjelltopp", "hytte", "sted"];

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={handleBlur}
        placeholder="Søk etter sted, hytte eller fjelltopp…"
        className="w-full px-4 py-2 text-sm"
        style={{
          background: "var(--color-surface-raised)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-text)",
          outline: "none",
        }}
      />
      {isLoading && (
        <p
          className="absolute right-3 top-2 text-xs"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Søker…
        </p>
      )}
      {error && (
        <p className="mt-1 text-xs" style={{ color: "var(--color-error-text)" }}>
          {error}
        </p>
      )}

      {results.length > 0 && (
        <ul
          className="absolute z-[2000] mt-1 w-full max-h-80 overflow-y-auto"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {categoryOrder.flatMap((cat) => {
            const items = grouped[cat];
            if (!items?.length) return [];
            return [
              <li
                key={`header-${cat}`}
                className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {CATEGORY_LABEL[cat]}
              </li>,
              ...items.map((r) => (
                <li
                  key={r.id}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(r); }}
                  className="cursor-pointer px-4 py-2 text-sm transition-colors"
                  style={{ color: "var(--color-text)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-raised)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {r.name}
                </li>
              )),
            ];
          })}
        </ul>
      )}
    </div>
  );
}
