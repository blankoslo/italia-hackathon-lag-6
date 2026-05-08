export interface RouteWaypoint {
  name: string;
  lat: number;
  lon: number;
}

export interface UtnoRoute {
  id: string;
  name: string;
  description?: string;
  distanceKm?: number;
  durationMinutes?: number;
  durationDays?: number;
  difficulty?: string; // EASY | MODERATE | TOUGH | VERY_TOUGH
  coordinates?: [number, number][]; // [lng, lat] pairs for map rendering
  elevations?: number[]; // meters asl, parallel to coordinates
  waypoints?: RouteWaypoint[]; // named stops along the route (cabins, summits)
  url?: string;
}

export interface Trip {
  id: string;
  name: string;
  startDate?: string; // ISO date
  endDate?: string;
  routes: UtnoRoute[];
  cabinIds: string[]; // DNT cabin IDs — populated when cabin integration is added
  participantIds: string[];
}
