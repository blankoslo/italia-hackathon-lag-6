"use client";
import { useState, useEffect } from "react";
import { useLocation } from "@/context/LocationContext";
import type { DaySummary } from "@/app/api/weather/route";

const WEATHER_SYMBOLS: Record<string, string> = {
  clearsky_day: "☀️",
  clearsky_night: "🌙",
  clearsky_polartwilight: "🌅",
  fair_day: "🌤️",
  fair_night: "🌤️",
  fair_polartwilight: "🌤️",
  partlycloudy_day: "⛅",
  partlycloudy_night: "⛅",
  partlycloudy_polartwilight: "⛅",
  cloudy: "☁️",
  fog: "🌫️",
  lightrain: "🌦️",
  rain: "🌧️",
  heavyrain: "🌧️",
  lightrainshowers_day: "🌦️",
  lightrainshowers_night: "🌦️",
  rainshowers_day: "🌧️",
  rainshowers_night: "🌧️",
  heavyrainshowers_day: "🌧️",
  heavyrainshowers_night: "🌧️",
  lightsnow: "🌨️",
  snow: "❄️",
  heavysnow: "❄️",
  lightsleet: "🌨️",
  sleet: "🌨️",
  thunder: "⛈️",
  lightrainandthunder: "⛈️",
  rainandthunder: "⛈️",
  snowandthunder: "⛈️",
};

function weatherEmoji(symbol: string): string {
  // Strip _day/_night/_polartwilight suffix for lookup if no direct match
  return WEATHER_SYMBOLS[symbol] ?? WEATHER_SYMBOLS[symbol.replace(/_(day|night|polartwilight)$/, "")] ?? "🌡️";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nb-NO", { weekday: "short", day: "numeric", month: "short" });
}

const FORECAST_DAYS = 9;

export function WeatherPanel() {
  const { location } = useLocation();
  const [days, setDays] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    setError(null);
    fetch(`/api/weather?lat=${location.lat}&lon=${location.lon}`)
      .then((r) => r.json())
      .then((data: DaySummary[]) => setDays(data))
      .catch(() => setError("Kunne ikke hente værdata"))
      .finally(() => setLoading(false));
  }, [location]);

  if (!location) {
    return (
      <p className="text-xs text-gray-400 italic">Søk etter et sted for å se vær.</p>
    );
  }

  const displayed = days.filter((d) => {
    if (startDate && d.date < startDate) return false;
    if (endDate && d.date > endDate) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-gray-600">Værvarsel for {location.name ?? "valgt sted"}</p>

      <div className="flex gap-1 items-center">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="flex-1 rounded border px-1 py-0.5 text-xs"
          aria-label="Fra dato"
        />
        <span className="text-xs text-gray-400">–</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="flex-1 rounded border px-1 py-0.5 text-xs"
          aria-label="Til dato"
        />
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(""); setEndDate(""); }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {loading && (
        <ul className="flex flex-col gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="h-10 rounded bg-gray-100 animate-pulse" />
          ))}
        </ul>
      )}

      {!loading && displayed.length > 0 && (
        <ul className="flex flex-col gap-1">
          {displayed.map((d, i) => {
            const isLowReliability = i >= FORECAST_DAYS;
            return (
              <li
                key={d.date}
                className={`rounded px-2 py-1.5 text-xs flex items-center gap-2 ${isLowReliability ? "bg-gray-50 opacity-60" : "bg-blue-50"}`}
              >
                <span className="text-base leading-none">{weatherEmoji(d.symbol)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{formatDate(d.date)}</p>
                  <p className="text-gray-500">
                    {d.tempMin}° – {d.tempMax}°C
                    {d.precipMm > 0 && ` · ${d.precipMm} mm`}
                    {` · ${d.windMax} m/s`}
                  </p>
                </div>
                {isLowReliability && (
                  <span className="shrink-0 rounded bg-gray-200 px-1 py-0.5 text-gray-500 text-[10px]">usikker</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!loading && days.length > 0 && displayed.length === 0 && (
        <p className="text-xs text-gray-400 italic">Ingen dager i valgt periode.</p>
      )}

      <p className="text-[10px] text-gray-400">Kilde: Yr/MET Norway</p>
    </div>
  );
}
