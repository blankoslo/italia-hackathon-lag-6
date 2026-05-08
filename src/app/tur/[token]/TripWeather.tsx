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
  tripId: string | null;
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

  const inputStyle = {
    background: "var(--color-surface-raised)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text)",
    padding: "4px 8px",
    fontSize: "0.875rem",
    outline: "none",
    colorScheme: "dark" as const,
  };

  return (
    <section>
      <h2
        className="text-xs font-bold uppercase tracking-widest mb-2"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Vær
      </h2>
      <div
        className="rounded-2xl p-4 flex flex-col gap-3"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        {/* Date pickers */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5 flex-1">
            <label className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Fra</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartChange(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <label className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Til</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndChange(e.target.value)}
              style={inputStyle}
            />
          </div>
          {saving && (
            <span className="text-xs mt-4" style={{ color: "var(--color-text-secondary)" }}>
              Lagrer…
            </span>
          )}
        </div>

        {loading && (
          <ul className="flex flex-col gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                className="h-10 rounded-lg animate-pulse"
                style={{ background: "var(--color-surface-raised)" }}
              />
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
                  className="rounded-lg px-3 py-2 flex items-center gap-3"
                  style={{
                    background: lowReliability ? "var(--color-surface-raised)" : "rgba(79,89,251,0.12)",
                    opacity: lowReliability ? 0.65 : 1,
                  }}
                >
                  <span className="text-xl leading-none">{emoji(d.symbol)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                      {fmtDate(d.date)}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {d.tempMin}° – {d.tempMax}°C
                      {d.precipMm > 0 && ` · ${d.precipMm} mm`}
                      {` · ${d.windMax} m/s vind`}
                    </p>
                  </div>
                  {lowReliability && (
                    <span
                      className="shrink-0 text-[10px] px-1 py-0.5"
                      style={{
                        borderRadius: "var(--radius-sm)",
                        background: "var(--color-surface-raised)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      usikker
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!loading && days.length > 0 && displayed.length === 0 && (
          <p className="text-sm italic" style={{ color: "var(--color-text-secondary)" }}>
            Ingen dager i valgt periode.
          </p>
        )}

        {!loading && days.length === 0 && (
          <p className="text-sm italic" style={{ color: "var(--color-text-secondary)" }}>
            Kunne ikke hente værdata.
          </p>
        )}

        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Kilde: Yr/MET Norway
        </p>
      </div>
    </section>
  );
}
