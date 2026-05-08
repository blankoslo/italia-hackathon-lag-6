"use client";

import { useState } from "react";
import type { Expense, StoredParticipant } from "@/lib/tripStore";

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

function settle(expenses: Expense[]): Settlement[] {
  const balance: Record<string, number> = {};

  for (const e of expenses) {
    const share = e.amount / e.splitAmong.length;
    balance[e.paidBy] = (balance[e.paidBy] ?? 0) + e.amount;
    for (const name of e.splitAmong) {
      balance[name] = (balance[name] ?? 0) - share;
    }
  }

  const creditors = Object.entries(balance)
    .filter(([, b]) => b > 0.01)
    .map(([name, b]) => ({ name, amount: b }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = Object.entries(balance)
    .filter(([, b]) => b < -0.01)
    .map(([name, b]) => ({ name, amount: -b }))
    .sort((a, b) => b.amount - a.amount);

  const transactions: Settlement[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amount = Math.min(c.amount, d.amount);
    transactions.push({ from: d.name, to: c.name, amount });
    c.amount -= amount;
    d.amount -= amount;
    if (c.amount < 0.01) ci++;
    if (d.amount < 0.01) di++;
  }

  return transactions;
}

function participantsOnStage(participants: StoredParticipant[], stageIndex: number): string[] {
  return participants
    .filter(p => !p.stageIndices || p.stageIndices.includes(stageIndex))
    .map(p => p.name);
}

const inputStyle: React.CSSProperties = {
  background: "var(--color-surface-raised)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--color-text)",
  padding: "6px 12px",
  fontSize: "0.875rem",
  outline: "none",
  width: "100%",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  colorScheme: "dark" as const,
};

export function ExpenseSection({
  tripId,
  participants,
  initial,
  stageNames = [],
}: {
  tripId: string;
  participants: StoredParticipant[];
  initial: Expense[];
  stageNames?: string[];
}) {
  const [expenses, setExpenses] = useState<Expense[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(participants[0]?.name ?? "");
  const [splitAmong, setSplitAmong] = useState<string[]>(participants.map(p => p.name));
  const [stageFilter, setStageFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const multiStage = stageNames.length > 1;

  function handleStageFilter(val: string) {
    setStageFilter(val);
    setSplitAmong(
      val === ""
        ? participants.map(p => p.name)
        : participantsOnStage(participants, parseInt(val))
    );
  }

  function toggleSplit(name: string) {
    setSplitAmong(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !amount || !paidBy || splitAmong.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          amount: parseFloat(amount),
          paidBy,
          splitAmong,
        }),
      });
      if (!res.ok) throw new Error();
      setExpenses(await res.json());
      setDescription("");
      setAmount("");
      setStageFilter("");
      setSplitAmong(participants.map(p => p.name));
      setShowForm(false);
    } catch {
      setError("Kunne ikke lagre utgift. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  }

  const settlements = settle(expenses);

  return (
    <section>
      <h2
        className="text-xs font-bold uppercase tracking-widest mb-2"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Utgifter
      </h2>

      {/* Expense list */}
      {expenses.length > 0 && (
        <ul className="flex flex-col gap-2 mb-3">
          {expenses.map(exp => (
            <li
              key={exp.id}
              className="rounded-2xl px-4 py-3 flex items-start justify-between gap-3"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                  {exp.description}
                </span>
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  Betalt av <span className="font-medium">{exp.paidBy}</span>
                  {" · "}fordelt på {exp.splitAmong.join(", ")}
                </span>
              </div>
              <span className="text-sm font-semibold whitespace-nowrap" style={{ color: "var(--color-text)" }}>
                {exp.amount.toFixed(0)} kr
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Settlement */}
      {settlements.length > 0 && (
        <div
          className="rounded-2xl px-4 py-3 mb-3"
          style={{ background: "rgba(79,89,251,0.10)", border: "1px solid rgba(79,89,251,0.2)" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--color-brand)" }}>
            Oppgjør
          </p>
          <ul className="flex flex-col gap-1">
            {settlements.map((s, i) => (
              <li key={i} className="text-sm" style={{ color: "var(--color-text)" }}>
                <span className="font-medium">{s.from}</span> skylder{" "}
                <span className="font-medium">{s.to}</span>{" "}
                <span className="font-semibold">{s.amount.toFixed(0)} kr</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {expenses.length === 0 && !showForm && (
        <div
          className="rounded-2xl p-4 text-sm italic mb-3"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
        >
          Ingen utgifter registrert ennå.
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <form
          onSubmit={handleAdd}
          className="rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Beskrivelse
            </label>
            <input
              autoFocus
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="F.eks. Middag dag 2"
              style={inputStyle}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Beløp (kr)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                style={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Betalt av
              </label>
              <select value={paidBy} onChange={e => setPaidBy(e.target.value)} style={selectStyle}>
                {participants.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {multiStage && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Gjelder etappe (valgfritt)
              </label>
              <select value={stageFilter} onChange={e => handleStageFilter(e.target.value)} style={selectStyle}>
                <option value="">Hele turen</option>
                {stageNames.map((name, i) => (
                  <option key={i} value={i}>Dag {i + 1}: {name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Fordeles på
            </label>
            <div className="flex flex-wrap gap-2">
              {participants.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleSplit(p.name)}
                  className="text-xs px-3 py-1 transition-opacity"
                  style={{
                    borderRadius: "var(--radius-full)",
                    border: "1px solid var(--color-border)",
                    background: splitAmong.includes(p.name) ? "var(--color-brand)" : "var(--color-surface-raised)",
                    color: splitAmong.includes(p.name) ? "#fff" : "var(--color-text-secondary)",
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs" style={{ color: "var(--color-error-text, #ef4444)" }}>
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !description.trim() || !amount || splitAmong.length === 0}
              className="text-sm font-semibold text-white px-4 py-2 disabled:opacity-40"
              style={{ background: "var(--color-brand)", borderRadius: "var(--radius-md)" }}
            >
              {loading ? "Lagrer…" : "Legg til"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm px-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Avbryt
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="text-sm flex items-center gap-1"
          style={{ color: "var(--color-brand)" }}
        >
          <span className="text-lg leading-none">+</span> Legg til utgift
        </button>
      )}
    </section>
  );
}
