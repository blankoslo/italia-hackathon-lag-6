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
      <h2
        className="text-xs font-bold uppercase tracking-widest mb-2"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Deltakere
      </h2>

      {participants.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1">
          {participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 px-4 py-2 text-sm"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <span
                className="h-7 w-7 flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  borderRadius: "var(--radius-full)",
                  background: "var(--color-brand)",
                  color: "#fff",
                }}
              >
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span className="font-medium" style={{ color: "var(--color-text)" }}>{p.name}</span>
              <span className="ml-auto text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {new Date(p.joinedAt).toLocaleDateString("nb-NO")}
              </span>
            </li>
          ))}
        </ul>
      )}

      {joined ? (
        <p
          className="px-4 py-3 text-sm font-medium"
          style={{
            borderRadius: "var(--radius-md)",
            background: "var(--color-success-bg)",
            color: "var(--color-success-text)",
            border: "1px solid rgba(200,247,197,0.2)",
          }}
        >
          Du er påmeldt!
        </p>
      ) : (
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Skriv inn navnet ditt…"
            className="flex-1 px-3 py-2 text-sm"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-surface-raised)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-text)",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{
              background: "var(--color-brand)",
              borderRadius: "var(--radius-md)",
            }}
          >
            {loading ? "…" : "Bli med"}
          </button>
        </form>
      )}
      {error && (
        <p className="mt-1 text-xs" style={{ color: "var(--color-error-text)" }}>
          {error}
        </p>
      )}
    </section>
  );
}
