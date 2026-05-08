export interface UtnoRoute {
  id: string;
  name: string;
  description?: string;
  distanceKm?: number;
  durationMinutes?: number;
  difficulty?: string;
  coordinates?: [number, number][]; // [lng, lat] pairs for map rendering
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
