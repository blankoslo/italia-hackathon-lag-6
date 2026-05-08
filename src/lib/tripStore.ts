export interface StoredParticipant {
  id: string;
  name: string;
  joinedAt: string;
  stageIndices?: number[]; // which stages (0-based) they join; undefined = all stages
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;       // participant name
  splitAmong: string[]; // participant names
  createdAt: string;
}

export interface StoredTrip {
  id: string;
  name: string;
  routeIds: string[];
  startDate?: string;
  endDate?: string;
  createdAt: string;
  participants: StoredParticipant[];
  expenses: Expense[];
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
    expenses: [],
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

export async function addExpense(
  tripId: string,
  data: Pick<Expense, "description" | "amount" | "paidBy" | "splitAmong">
): Promise<StoredTrip | null> {
  const trip = store.get(tripId);
  if (!trip) return null;
  const expense: Expense = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  trip.expenses = [...(trip.expenses ?? []), expense];
  store.set(tripId, trip);
  return trip;
}

export async function updateRouteIds(
  tripId: string,
  routeIds: string[]
): Promise<StoredTrip | null> {
  const trip = store.get(tripId);
  if (!trip) return null;
  trip.routeIds = routeIds;
  store.set(tripId, trip);
  return trip;
}

export async function joinTrip(
  tripId: string,
  name: string,
  stageIndices?: number[]
): Promise<StoredTrip | null> {
  const trip = store.get(tripId);
  if (!trip) return null;
  const participant: StoredParticipant = {
    id: crypto.randomUUID(),
    name: name.trim(),
    joinedAt: new Date().toISOString(),
    stageIndices,
  };
  trip.participants = [...trip.participants, participant];
  store.set(tripId, trip);
  return trip;
}
