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

export interface SavedCabin {
  id: string;
  name: string;
  lat: number;
  lon: number;
  serviceLevel?: string;
}

export interface Trip {
  id: string;
  name: string;
  startDate?: string; // ISO date
  endDate?: string;
  routes: UtnoRoute[];
  cabins: SavedCabin[]; // nearby UT.no cabins, saved for offline use
  participantIds: string[];
}
