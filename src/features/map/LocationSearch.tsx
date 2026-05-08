"use client";
import { useState, useEffect, useRef } from "react";
import { searchPlaces } from "./kartverket";
import { useLocation } from "@/context/LocationContext";
import type { Place } from "./types";

export function LocationSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setLocation } = useLocation();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        setResults(await searchPlaces(query));
      } catch (e) {
        setResults([]);
        setError(e instanceof Error ? e.message : "Søk feilet");
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleSelect(place: Place) {
    setLocation({ lat: place.lat, lon: place.lon, name: place.name });
    setQuery(place.name);
    setResults([]);
  }

  function handleBlur() {
    setTimeout(() => setResults([]), 150);
  }

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={handleBlur}
        placeholder="Søk etter et sted..."
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {isLoading && <p className="mt-1 text-xs text-gray-400">Søker...</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {results.length > 0 && (
        <ul className="absolute z-[1000] mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.map((place, i) => {
            const sub = [place.municipality, place.county]
              .filter(Boolean)
              .join(", ");
            return (
              <li
                key={i}
                onMouseDown={() => handleSelect(place)}
                className="cursor-pointer px-4 py-2 text-sm hover:bg-blue-50"
              >
                <span className="font-medium">{place.name}</span>
                {place.placeType && (
                  <span className="ml-1 text-xs text-gray-400">
                    {place.placeType}
                  </span>
                )}
                {sub && (
                  <span className="block text-xs text-gray-500">{sub}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
