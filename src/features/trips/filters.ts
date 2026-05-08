"use client";
import { useState } from "react";
import type { Trip, UtnoRoute } from "@/types/trip";

export type RouteCategory = "dagtur" | "helgetur" | "familievennlig";

interface CategoryConfig {
  label: string;
  description: string;
  match: (route: UtnoRoute) => boolean;
}

const DAY_TRIP_KM = 15;

export const CATEGORY_CONFIG: Record<RouteCategory, CategoryConfig> = {
  dagtur: {
    label: "Dagtur",
    description: `Under ${DAY_TRIP_KM} km`,
    match: (r) => {
      if (r.distanceKm != null) return r.distanceKm <= DAY_TRIP_KM;
      if (r.durationDays != null || r.durationMinutes != null)
        return !r.durationDays && (r.durationMinutes ?? 0) <= 480;
      return true; // no data — include in both
    },
  },
  helgetur: {
    label: "Helgetur",
    description: `Over ${DAY_TRIP_KM} km`,
    match: (r) => {
      if (r.distanceKm != null) return r.distanceKm > DAY_TRIP_KM;
      if (r.durationDays != null || r.durationMinutes != null)
        return (r.durationDays ?? 0) >= 1 || (r.durationMinutes ?? 0) > 480;
      return true; // no data — include in both
    },
  },
  familievennlig: {
    label: "Familievennlig",
    description: "Enkel eller middels gradering",
    match: (r) => r.difficulty == null || r.difficulty === "EASY" || r.difficulty === "MODERATE",
  },
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG) as RouteCategory[];

function routeMatchesAny(route: UtnoRoute, filters: Set<RouteCategory>): boolean {
  return [...filters].some((cat) => CATEGORY_CONFIG[cat].match(route));
}

function tripMatchesAny(trip: Trip, filters: Set<RouteCategory>): boolean {
  return trip.routes.some((r) => routeMatchesAny(r, filters));
}

function mostRestrictive(
  filters: Set<RouteCategory>,
  countWithout: (f: Set<RouteCategory>) => number
): RouteCategory | null {
  let best: RouteCategory | null = null;
  let bestCount = -1;
  for (const cat of filters) {
    const without = new Set(filters);
    without.delete(cat);
    const count = countWithout(without);
    if (count > bestCount) {
      bestCount = count;
      best = cat;
    }
  }
  return best;
}

export function useRouteFilters() {
  const [activeFilters, setActiveFilters] = useState<Set<RouteCategory>>(new Set());

  function toggle(cat: RouteCategory) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function clear() {
    setActiveFilters(new Set());
  }

  function filterTrips(trips: Trip[]): Trip[] {
    if (!activeFilters.size) return trips;
    return trips.filter((t) => tripMatchesAny(t, activeFilters));
  }

  function filterRoutes(routes: UtnoRoute[]): UtnoRoute[] {
    if (!activeFilters.size) return routes;
    return routes.filter((r) => routeMatchesAny(r, activeFilters));
  }

  function mostRestrictiveFilter(trips: Trip[]): RouteCategory | null {
    if (!activeFilters.size || filterTrips(trips).length > 0) return null;
    return mostRestrictive(activeFilters, (f) =>
      trips.filter((t) => tripMatchesAny(t, f)).length
    );
  }

  function mostRestrictiveRouteFilter(routes: UtnoRoute[]): RouteCategory | null {
    if (!activeFilters.size || filterRoutes(routes).length > 0) return null;
    return mostRestrictive(activeFilters, (f) =>
      routes.filter((r) => routeMatchesAny(r, f)).length
    );
  }

  return {
    activeFilters,
    toggle,
    clear,
    filterTrips,
    filterRoutes,
    mostRestrictiveFilter,
    mostRestrictiveRouteFilter,
  };
}
