"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { StoredParticipant } from "@/lib/tripStore";

interface Props {
  tripId: string;
  initial: StoredParticipant[];
  alreadyJoined: boolean;
  stageNames?: string[]; // e.g. ["Gjendesheim → Memurubu", ...]
}

export function RSVPSection({ tripId, initial, alreadyJoined: initialJoined, stageNames = [] }: Props) {
  const router = useRouter();
  const [participants, setParticipants] = useState<StoredParticipant[]>(initial);
  const [joined, setJoined] = useState(initialJoined);
  const [name, setName] = useState("");
  const [selectedStages, setSelectedStages] = useState<number[]>(
    stageNames.map((_, i) => i) // default: all stages
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const multiStage = stageNames.length > 1;

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

  function toggleStage(i: number) {
    setSelectedStages(prev =>
      prev.includes(i) ? prev.filter(s => s !== i) : [...prev, i]
    );
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const stageIndices = multiStage && selectedStages.length < stageNames.length
        ? selectedStages
        : undefined; // undefined = all stages

      const res = await fetch(`/api/trips/${tripId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, stageIndices }),
      });
      if (res.status === 409) {
        setJoined(true);
        return;
      }
      if (!res.ok) throw new Error();
      const trip = await res.json();
      setParticipants(trip.participants);
      setJoined(true);
      router.refresh();
    } catch {
      setError("Kunne ikke melde deg på. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  }

  function stageLabel(p: StoredParticipant): string | null {
    if (!multiStage) return null;
    if (!p.stageIndices || p.stageIndices.length === stageNames.length) return null;
    return `Dag ${p.stageIndices.map(i => i + 1).join(", ")}`;
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
          {participants.map((p) => {
            const label = stageLabel(p);
            return (
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
                {label && (
                  <span
                    className="px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      borderRadius: "var(--radius-full)",
                      background: "var(--color-brand-subtle)",
                      color: "var(--color-brand)",
                    }}
                  >
                    {label}
                  </span>
                )}
                <span className="ml-auto text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {new Date(p.joinedAt).toLocaleDateString("nb-NO")}
                </span>
              </li>
            );
          })}
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
        <form onSubmit={handleJoin} className="flex flex-col gap-2">
          <div className="flex gap-2">
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
              disabled={loading || !name.trim() || (multiStage && selectedStages.length === 0)}
              className="px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
              style={{
                background: "var(--color-brand)",
                borderRadius: "var(--radius-md)",
              }}
            >
              {loading ? "…" : "Bli med"}
            </button>
          </div>
          {multiStage && (
            <div className="flex flex-col gap-1">
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Velg hvilke etapper du er med på:</p>
              <div className="flex flex-wrap gap-1.5">
                {stageNames.map((stageName, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleStage(i)}
                    className="text-xs px-2.5 py-1 transition-colors"
                    style={{
                      borderRadius: "var(--radius-full)",
                      border: selectedStages.includes(i) ? "1px solid var(--color-brand)" : "1px solid var(--color-border)",
                      background: selectedStages.includes(i) ? "var(--color-brand)" : "transparent",
                      color: selectedStages.includes(i) ? "#fff" : "var(--color-text-secondary)",
                    }}
                  >
                    Dag {i + 1}: {stageName}
                  </button>
                ))}
              </div>
            </div>
          )}
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
