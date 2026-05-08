import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Trip } from "@/types/trip";

interface FriluftDB extends DBSchema {
  trips: { key: string; value: Trip };
}

let dbPromise: Promise<IDBPDatabase<FriluftDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<FriluftDB>("friluftskompis", 1, {
      upgrade(db) {
        db.createObjectStore("trips", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export async function getAllTrips(): Promise<Trip[]> {
  return (await getDB()).getAll("trips");
}

export async function getTrip(id: string): Promise<Trip | undefined> {
  return (await getDB()).get("trips", id);
}

export async function persistTrip(trip: Trip): Promise<void> {
  await (await getDB()).put("trips", trip);
}

export async function removeTrip(id: string): Promise<void> {
  await (await getDB()).delete("trips", id);
}
