export interface StoredParticipant {
  id: string;
  name: string;
  joinedAt: string;
}

export interface StoredTrip {
  id: string;
  name: string;
  routeIds: string[];
  startDate?: string;
  endDate?: string;
  createdAt: string;
  participants: StoredParticipant[];
}

// Attach to global so API routes and server components share the same Map
// across Next.js module boundaries.
declare global { var __tripStore: Map<string, StoredTrip> | undefined }
const store: Map<string, StoredTrip> =
  global.__tripStore ?? (global.__tripStore = new Map());

export async function createStoredTrip(
  data: Pick<StoredTrip, "name" | "routeIds" | "startDate" | "endDate">
): Promise<StoredTrip> {
  const trip: StoredTrip = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    participants: [],
  };
  store.set(trip.id, trip);
  return trip;
}

export async function getStoredTrip(id: string): Promise<StoredTrip | null> {
  return store.get(id) ?? null;
}

export async function updateTripDates(
  tripId: string,
  startDate: string | undefined,
  endDate: string | undefined
): Promise<StoredTrip | null> {
  const trip = store.get(tripId);
  if (!trip) return null;
  trip.startDate = startDate;
  trip.endDate = endDate;
  store.set(tripId, trip);
  return trip;
}

export async function joinTrip(
  tripId: string,
  name: string
): Promise<StoredTrip | null> {
  const trip = store.get(tripId);
  if (!trip) return null;
  const participant: StoredParticipant = {
    id: crypto.randomUUID(),
    name: name.trim(),
    joinedAt: new Date().toISOString(),
  };
  trip.participants = [...trip.participants, participant];
  store.set(tripId, trip);
  return trip;
}
