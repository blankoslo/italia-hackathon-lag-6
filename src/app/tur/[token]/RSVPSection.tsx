"use client";
import { useState, useEffect } from "react";
import type { StoredParticipant } from "@/lib/tripStore";

interface Props {
  tripId: string;
  initial: StoredParticipant[];
  alreadyJoined: boolean;
}

export function RSVPSection({ tripId, initial, alreadyJoined: initialJoined }: Props) {
  const [participants, setParticipants] = useState<StoredParticipant[]>(initial);
  const [joined, setJoined] = useState(initialJoined);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/trips/${tripId}`);
        if (res.ok) {
          const trip = await res.json();
          setParticipants(trip.participants);
        }
      } catch {}
    }, 10_000);
    return () => clearInterval(interval);
  }, [tripId]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.status === 409) {
        setJoined(true);
        return;
      }
      if (!res.ok) throw new Error();
      const trip = await res.json();
      setParticipants(trip.participants);
      setJoined(true);
    } catch {
      setError("Kunne ikke melde deg på. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Deltakere
      </h2>

      {participants.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1">
          {participants.map((p) => (
            <li key={p.id} className="flex items-center gap-2 bg-white rounded-lg border px-4 py-2 text-sm">
              <span className="h-6 w-6 flex items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-bold shrink-0">
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span className="font-medium">{p.name}</span>
              <span className="ml-auto text-xs text-gray-400">
                {new Date(p.joinedAt).toLocaleDateString("nb-NO")}
              </span>
            </li>
          ))}
        </ul>
      )}

      {joined ? (
        <p className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
          Du er påmeldt!
        </p>
      ) : (
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Skriv inn navnet ditt…"
            className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "…" : "Bli med"}
          </button>
        </form>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </section>
  );
}
