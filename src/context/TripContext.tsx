"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Trip } from "@/types/trip";
import { getAllTrips, persistTrip, removeTrip } from "@/features/trips/store";

interface TripContextValue {
  trips: Trip[];
  saveTrip: (trip: Trip) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  createTrip: (name: string) => Trip;
}

const TripContext = createContext<TripContextValue>({
  trips: [],
  saveTrip: async () => {},
  deleteTrip: async () => {},
  createTrip: () => {
    throw new Error("TripProvider not mounted");
  },
});

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    getAllTrips().then(setTrips);
  }, []);

  const saveTrip = useCallback(async (trip: Trip) => {
    await persistTrip(trip);
    setTrips((prev) => {
      const idx = prev.findIndex((t) => t.id === trip.id);
      return idx >= 0 ? prev.with(idx, trip) : [...prev, trip];
    });
  }, []);

  const deleteTrip = useCallback(async (id: string) => {
    await removeTrip(id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const createTrip = useCallback(
    (name: string): Trip => ({
      id: crypto.randomUUID(),
      name,
      routes: [],
      cabinIds: [],
      participantIds: [],
    }),
    []
  );

  return (
    <TripContext.Provider value={{ trips, saveTrip, deleteTrip, createTrip }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrips() {
  return useContext(TripContext);
}
