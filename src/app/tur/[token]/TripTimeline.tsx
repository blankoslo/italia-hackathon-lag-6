"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { UtnoRoute } from "@/types/trip";
import { calcElevationGain, buildDayOffsets, totalTripDays, stageDays } from "@/lib/routeUtils";

interface DaySummary {
  date: string;
  tempMin: number;
  tempMax: number;
  precipMm: number;
  windMax: number;
  symbol: string;
}

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

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", { weekday: "short", day: "numeric", month: "short" });
}

function routeMidpoint(route: UtnoRoute): { lat: number; lon: number } | null {
  const coords = route.coordinates;
  if (!coords?.length) return null;
  const mid = coords[Math.floor(coords.length / 2)];
  return { lat: mid[1], lon: mid[0] };
}

function ElevationProfile({ elevations }: { elevations: number[] }) {
  if (elevations.length < 2) return null;
  const step = Math.max(1, Math.floor(elevations.length / 150));
  const sampled = elevations.filter((_, i) => i % step === 0);
  const minEl = Math.min(...sampled);
  const maxEl = Math.max(...sampled);
  const range = maxEl - minEl || 1;
  const W = 240, H = 36;
  const pts = sampled
    .map((el, i) => {
      const x = (i / (sampled.length - 1)) * W;
      const y = H - ((el - minEl) / range) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8 overflow-visible" preserveAspectRatio="none" aria-label="Høydeprofil">
        <defs>
          <linearGradient id="tl-elev-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#tl-elev-grad)" />
        <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="1.5" />
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 leading-none mt-0.5">
        <span>{minEl.toFixed(0)} moh.</span>
        <span className="text-gray-400">Høydeprofil</span>
        <span>{maxEl.toFixed(0)} moh.</span>
      </div>
    </div>
  );
}

interface Props {
  routes: UtnoRoute[];
  startDate?: string;
  tripId?: string;
}

export function TripTimeline({ routes: initialRoutes, startDate, tripId }: Props) {
  const router = useRouter();
  const [routes, setRoutes] = useState(initialRoutes);
  const [weatherByRoute, setWeatherByRoute] = useState<Record<string, DaySummary[]>>({});
  const [reordering, setReordering] = useState(false);
  // AI-estimated durations for routes that lack durationMinutes
  const [aiDurations, setAiDurations] = useState<Record<string, number>>({});

  const effectiveDuration = (r: UtnoRoute) => r.durationMinutes ?? aiDurations[r.id];
  const dayOffsets = buildDayOffsets(routes.map(r => effectiveDuration(r)));
  const tripDays = totalTripDays(routes.map(r => effectiveDuration(r)));

  useEffect(() => {
    setRoutes(initialRoutes);
  }, [initialRoutes]);

  useEffect(() => {
    const fetches = routes.map(async (route) => {
      const mid = routeMidpoint(route);
      if (!mid) return [route.id, []] as const;
      const res = await fetch(`/api/weather?lat=${mid.lat.toFixed(4)}&lon=${mid.lon.toFixed(4)}`);
      if (!res.ok) return [route.id, []] as const;
      const days: DaySummary[] = await res.json();
      return [route.id, days] as const;
    });
    Promise.all(fetches)
      .then(entries => setWeatherByRoute(Object.fromEntries(entries)))
      .catch(() => {});
  }, [routes]);

  useEffect(() => {
    const needsEstimate = routes.filter(
      r => !r.durationMinutes && r.distanceKm && r.distanceKm > 0
    );
    if (!needsEstimate.length) return;
    const fetches = needsEstimate.map(async (route) => {
      const gain = route.elevations?.length ? calcElevationGain(route.elevations) : 0;
      const params = new URLSearchParams({
        distanceKm: String(route.distanceKm!),
        elevationGain: String(gain),
        ...(route.difficulty ? { difficulty: route.difficulty } : {}),
      });
      const res = await fetch(`/api/estimate-duration?${params}`);
      if (!res.ok) return null;
      const { minutes } = await res.json();
      return [route.id, minutes] as const;
    });
    Promise.all(fetches).then(entries => {
      const valid = entries.filter((e): e is [string, number] => e !== null);
      if (valid.length) setAiDurations(prev => ({ ...prev, ...Object.fromEntries(valid) }));
    }).catch(() => {});
  }, [routes]);

  async function move(index: number, direction: -1 | 1) {
    const newRoutes = [...routes];
    const target = index + direction;
    [newRoutes[index], newRoutes[target]] = [newRoutes[target], newRoutes[index]];
    setRoutes(newRoutes);
    if (!tripId) return;
    setReordering(true);
    await fetch(`/api/trips/${tripId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routeIds: newRoutes.map(r => r.id) }),
    }).catch(() => {});
    setReordering(false);
    router.refresh();
  }

  if (routes.length <= 1 && !startDate) return null;

  return (
    <section>
      <div className="flex items-baseline gap-2 mb-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Dagsplan
        </h2>
        <span className="text-xs text-gray-400">
          Estimert {tripDays} {tripDays === 1 ? "dag" : "dager"} basert på gangtid
          {reordering && " · Lagrer…"}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {routes.map((route, i) => {
          const dayOffset = dayOffsets[i];
          const date = startDate ? addDays(startDate, dayOffset) : null;
          const gain = route.elevations?.length ? calcElevationGain(route.elevations) : null;
          const duration = effectiveDuration(route);
          const isAiDuration = !route.durationMinutes && !!aiDurations[route.id];
          const days = stageDays(duration);
          const weather = date
            ? (weatherByRoute[route.id] ?? []).find(d => d.date === date) ?? null
            : null;
          const canMoveUp = tripId && i > 0;
          const canMoveDown = tripId && i < routes.length - 1;

          return (
            <li key={route.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-start gap-2">
                {tripId && (
                  <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={!canMoveUp || reordering}
                      className="rounded p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                      aria-label="Flytt opp"
                    >▲</button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={!canMoveDown || reordering}
                      className="rounded p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                      aria-label="Flytt ned"
                    >▼</button>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                          Dag {dayOffset + 1}{days > 1 ? `–${dayOffset + days}` : ""}
                        </span>
                        {date && (
                          <span className="text-xs text-gray-400">{fmtDate(date)}</span>
                        )}
                        {gain != null && gain > 1000 && (
                          <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-800">
                            Krevende
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 mt-0.5">{route.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        {route.distanceKm != null && (
                          <span>{route.distanceKm.toFixed(1)} km</span>
                        )}
                        {gain != null && <span>{gain} m stigning</span>}
                        {duration != null && duration > 0 && (
                          <span className="flex items-center gap-1">
                            ~{Math.round(duration / 60)} t gange
                            {isAiDuration && (
                              <span className="rounded px-1 py-0.5 text-[9px] font-medium bg-purple-100 text-purple-700">AI</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    {weather && (
                      <div className="shrink-0 text-right">
                        <div className="text-2xl leading-none">{emoji(weather.symbol)}</div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {weather.tempMin}° – {weather.tempMax}°C
                        </p>
                      </div>
                    )}
                  </div>
                  {route.elevations && route.elevations.length > 1 && (
                    <ElevationProfile elevations={route.elevations} />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
