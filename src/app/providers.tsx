"use client";
import { LocationProvider } from "@/context/LocationContext";
import { TripProvider } from "@/context/TripContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocationProvider>
      <TripProvider>{children}</TripProvider>
    </LocationProvider>
  );
}
