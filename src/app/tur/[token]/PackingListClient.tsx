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
      {/* Context — what the list is based on */}
      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-green-800">
          <span className="bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">AI</span>
          Generert basert på
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          {context.routeNames.map((name) => (
            <span key={name} className="text-xs bg-white border border-green-200 text-green-800 rounded-full px-2 py-0.5">
              {name}
            </span>
          ))}
          <span className="text-xs bg-white border border-green-200 text-green-800 rounded-full px-2 py-0.5">
            {context.days} {context.days === 1 ? "dag" : "dager"} · {context.totalKm.toFixed(0)} km
          </span>
          <span className="text-xs bg-white border border-green-200 text-green-800 rounded-full px-2 py-0.5">
            {SEASON_EMOJI[context.season]} {context.season}
          </span>
          <span className="text-xs bg-white border border-green-200 text-green-800 rounded-full px-2 py-0.5">
            {DIFFICULTY_LABELS[context.difficulty] ?? context.difficulty}
          </span>
          <span className="text-xs bg-white border border-green-200 text-green-800 rounded-full px-2 py-0.5">
            👥 {context.participantCount} {context.participantCount === 1 ? "person" : "personer"}
          </span>
        </div>
      </div>

      {/* Categories */}
      {Object.entries(lists).map(([category, items]) => {
        const isCollapsed = collapsed.has(category);
        const doneCount = items.filter((i) => checked.has(`${category}:${i.label}`)).length;
        return (
        <div key={category} className="bg-white rounded-lg border overflow-hidden">
          <button
            onClick={() => toggleCollapse(category)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <h3 className="text-sm font-semibold text-gray-700">{category}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{doneCount}/{items.length}</span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
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
                      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs transition-colors ${
                        done ? "bg-green-600 border-green-600 text-white" : "border-gray-300"
                      }`}
                    >
                      {done && "✓"}
                    </span>
                    <span className={done ? "line-through text-gray-400" : "text-gray-700"}>
                      {item.label}
                    </span>
                  </button>
                  {item.aiGenerated ? (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded flex-shrink-0">
                      AI
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1 rounded flex-shrink-0">
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
                className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-green-500"
              />
              <button
                onClick={() => addItem(category)}
                className="text-sm text-white bg-green-600 hover:bg-green-700 rounded px-3 py-1"
              >
                Legg til
              </button>
              <button
                onClick={() => { setAdding(null); setDraft(""); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Avbryt
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(category)}
              className="mt-2 text-xs text-green-700 hover:text-green-900 flex items-center gap-1"
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
