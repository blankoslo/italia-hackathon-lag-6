"use client";
import { useState, useEffect, useCallback } from "react";
import type { UtnoRoute } from "@/types/trip";
import type { DaySummary } from "@/app/api/weather/route";

const WEATHER_SYMBOLS: Record<string, string> = {
  clearsky_day: "☀️",        clearsky_night: "🌙",
  fair_day: "🌤️",            fair_night: "🌤️",
  partlycloudy_day: "⛅",    partlycloudy_night: "⛅",
  cloudy: "☁️",              fog: "🌫️",
  lightrain: "🌦️",          rain: "🌧️",       heavyrain: "🌧️",
  lightrainshowers_day: "🌦️", rainshowers_day: "🌧️",
  lightsnow: "🌨️",          snow: "❄️",        heavysnow: "❄️",
  sleet: "🌨️",              thunder: "⛈️",     rainandthunder: "⛈️",
};

function emoji(symbol: string) {
  return WEATHER_SYMBOLS[symbol] ?? WEATHER_SYMBOLS[symbol.replace(/_(day|night|polartwilight)$/, "")] ?? "🌡️";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", { weekday: "short", day: "numeric", month: "short" });
}

function centerOf(routes: UtnoRoute[]): { lat: number; lon: number } | null {
  const coords = routes.flatMap((r) => r.coordinates ?? []);
  if (!coords.length) return null;
  const lat = coords.reduce((s, [, y]) => s + y, 0) / coords.length;
  const lon = coords.reduce((s, [x]) => s + x, 0) / coords.length;
  return { lat, lon };
}

interface Props {
  routes: UtnoRoute[];
  tripId: string | null; // null for legacy token-based trips
  initialStart?: string;
  initialEnd?: string;
}

export function TripWeather({ routes, tripId, initialStart, initialEnd }: Props) {
  const [startDate, setStartDate] = useState(initialStart ?? "");
  const [endDate, setEndDate] = useState(initialEnd ?? "");
  const [days, setDays] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const center = centerOf(routes);

  useEffect(() => {
    if (!center) return;
    setLoading(true);
    fetch(`/api/weather?lat=${center.lat.toFixed(4)}&lon=${center.lon.toFixed(4)}`)
      .then((r) => r.json())
      .then(setDays)
      .catch(() => {})
      .finally(() => setLoading(false));
  // only re-fetch when center changes (routes prop)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes]);

  const saveDates = useCallback(
    async (start: string, end: string) => {
      if (!tripId) return;
      setSaving(true);
      await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: start, endDate: end }),
      }).catch(() => {});
      setSaving(false);
    },
    [tripId]
  );

  function handleStartChange(val: string) {
    setStartDate(val);
    saveDates(val, endDate);
  }

  function handleEndChange(val: string) {
    setEndDate(val);
    saveDates(startDate, val);
  }

  const displayed = days.filter((d) => {
    if (startDate && d.date < startDate) return false;
    if (endDate && d.date > endDate) return false;
    return true;
  });

  if (!center) return null;

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Vær
      </h2>
      <div className="bg-white rounded-lg border p-4 flex flex-col gap-3">
        {/* Date picker */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5 flex-1">
            <label className="text-xs text-gray-500">Fra</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartChange(e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            />
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <label className="text-xs text-gray-500">Til</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndChange(e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            />
          </div>
          {saving && <span className="text-xs text-gray-400 mt-4">Lagrer…</span>}
        </div>

        {loading && (
          <ul className="flex flex-col gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="h-10 rounded bg-gray-100 animate-pulse" />
            ))}
          </ul>
        )}

        {!loading && displayed.length > 0 && (
          <ul className="flex flex-col gap-1">
            {displayed.map((d) => {
              const cutoff = new Date();
              cutoff.setDate(cutoff.getDate() + 9);
              const lowReliability = d.date > cutoff.toISOString().slice(0, 10);
              return (
                <li
                  key={d.date}
                  className={`rounded px-3 py-2 flex items-center gap-3 ${lowReliability ? "bg-gray-50 opacity-60" : "bg-blue-50"}`}
                >
                  <span className="text-xl leading-none">{emoji(d.symbol)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{fmtDate(d.date)}</p>
                    <p className="text-xs text-gray-500">
                      {d.tempMin}° – {d.tempMax}°C
                      {d.precipMm > 0 && ` · ${d.precipMm} mm`}
                      {` · ${d.windMax} m/s vind`}
                    </p>
                  </div>
                  {lowReliability && (
                    <span className="shrink-0 text-[10px] rounded bg-gray-200 px-1 py-0.5 text-gray-500">usikker</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!loading && days.length > 0 && displayed.length === 0 && (
          <p className="text-sm text-gray-400 italic">Ingen dager i valgt periode.</p>
        )}

        {!loading && days.length === 0 && (
          <p className="text-sm text-gray-400 italic">Kunne ikke hente værdata.</p>
        )}

        <p className="text-xs text-gray-400">Kilde: Yr/MET Norway</p>
      </div>
    </section>
  );
}
