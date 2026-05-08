"use client";

import { useState } from "react";
import type { PackingCategory, PackingContext } from "./PackingList";

const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: "Enkel",
  MODERATE: "Middels",
  TOUGH: "Krevende",
  VERY_TOUGH: "Meget krevende",
};

const SEASON_EMOJI: Record<string, string> = {
  sommer: "☀️",
  vinter: "❄️",
  "vår/høst": "🍂",
};

interface Item {
  label: string;
  aiGenerated: boolean;
}

export function PackingListClient({
  categories,
  context,
}: {
  categories: PackingCategory[];
  context: PackingContext;
}) {
  const [lists, setLists] = useState<Record<string, Item[]>>(() =>
    Object.fromEntries(
      categories.map((cat) => [
        cat.category,
        cat.items.map((label) => ({ label, aiGenerated: true })),
      ])
    )
  );
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function toggleCollapse(category: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  }

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function addItem(category: string) {
    const label = draft.trim();
    if (!label) return;
    setLists((prev) => ({
      ...prev,
      [category]: [...(prev[category] ?? []), { label, aiGenerated: false }],
    }));
    setDraft("");
    setAdding(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* AI context banner */}
      <div
        className="px-4 py-3 flex flex-col gap-1"
        style={{
          background: "var(--color-brand-subtle)",
          border: "1px solid var(--color-brand-border)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--color-text)" }}>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5"
            style={{
              background: "var(--color-brand)",
              color: "#fff",
              borderRadius: "var(--radius-full)",
            }}
          >
            ✦ AI-forslag
          </span>
          Generert basert på
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          {context.routeNames.map((name) => (
            <span
              key={name}
              className="text-xs px-2 py-0.5"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-brand-border)",
                color: "var(--color-text-subtle)",
                borderRadius: "var(--radius-full)",
              }}
            >
              {name}
            </span>
          ))}
          <span
            className="text-xs px-2 py-0.5"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-brand-border)",
              color: "var(--color-text-subtle)",
              borderRadius: "var(--radius-full)",
            }}
          >
            {context.days} {context.days === 1 ? "dag" : "dager"} · {context.totalKm.toFixed(0)} km
          </span>
          <span
            className="text-xs px-2 py-0.5"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-brand-border)",
              color: "var(--color-text-subtle)",
              borderRadius: "var(--radius-full)",
            }}
          >
            {SEASON_EMOJI[context.season]} {context.season}
          </span>
          <span
            className="text-xs px-2 py-0.5"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-brand-border)",
              color: "var(--color-text-subtle)",
              borderRadius: "var(--radius-full)",
            }}
          >
            {DIFFICULTY_LABELS[context.difficulty] ?? context.difficulty}
          </span>
          <span
            className="text-xs px-2 py-0.5"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-brand-border)",
              color: "var(--color-text-subtle)",
              borderRadius: "var(--radius-full)",
            }}
          >
            👥 {context.participantCount} {context.participantCount === 1 ? "person" : "personer"}
          </span>
        </div>
      </div>

      {/* Categories */}
      {Object.entries(lists).map(([category, items]) => {
        const isCollapsed = collapsed.has(category);
        const doneCount = items.filter((i) => checked.has(`${category}:${i.label}`)).length;
        return (
          <div
            key={category}
            className="overflow-hidden"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <button
              onClick={() => toggleCollapse(category)}
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
              style={{ color: "var(--color-text)" }}
            >
              <h3 className="text-sm font-semibold">{category}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {doneCount}/{items.length}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                  style={{ color: "var(--color-text-secondary)" }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            {!isCollapsed && (
              <div className="px-4 pb-4">
                <ul className="flex flex-col gap-1.5">
                  {items.map((item) => {
                    const key = `${category}:${item.label}`;
                    const done = checked.has(key);
                    return (
                      <li key={key} className="flex items-center gap-2">
                        <button
                          onClick={() => toggle(key)}
                          className="flex items-center gap-2 text-sm text-left flex-1"
                        >
                          <span
                            className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-xs transition-colors"
                            style={{
                              borderRadius: "var(--radius-sm)",
                              border: done ? "none" : "1px solid var(--color-surface-raised)",
                              background: done ? "var(--color-brand)" : "transparent",
                              color: "#fff",
                            }}
                          >
                            {done && "✓"}
                          </span>
                          <span style={{ color: done ? "var(--color-text-disabled)" : "var(--color-text)", textDecoration: done ? "line-through" : "none" }}>
                            {item.label}
                          </span>
                        </button>
                        {item.aiGenerated ? (
                          <span
                            className="text-[10px] font-bold px-1 flex-shrink-0"
                            style={{
                              borderRadius: "var(--radius-sm)",
                              background: "var(--color-brand-subtle)",
                              color: "var(--color-brand)",
                              border: "1px solid var(--color-brand-border)",
                            }}
                          >
                            AI
                          </span>
                        ) : (
                          <span
                            className="text-[10px] font-bold px-1 flex-shrink-0"
                            style={{
                              borderRadius: "var(--radius-sm)",
                              background: "var(--color-surface-raised)",
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            Meg
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/* Add item */}
                {adding === category ? (
                  <div className="flex gap-2 mt-3">
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addItem(category);
                        if (e.key === "Escape") { setAdding(null); setDraft(""); }
                      }}
                      placeholder="Legg til utstyr…"
                      className="flex-1 text-sm px-2 py-1"
                      style={{
                        background: "var(--color-surface-raised)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--color-text)",
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={() => addItem(category)}
                      className="text-sm text-white px-3 py-1"
                      style={{ background: "var(--color-brand)", borderRadius: "var(--radius-sm)" }}
                    >
                      Legg til
                    </button>
                    <button
                      onClick={() => { setAdding(null); setDraft(""); }}
                      className="text-sm"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Avbryt
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAdding(category)}
                    className="mt-2 text-xs flex items-center gap-1"
                    style={{ color: "var(--color-brand)" }}
                  >
                    <span className="text-base leading-none">+</span> Legg til eget utstyr
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
