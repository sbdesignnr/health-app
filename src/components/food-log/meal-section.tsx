"use client";

import { Plus } from "lucide-react";
import type { LogItem, MealKey } from "./types";

export function MealSection({
  label,
  mealKey,
  items,
  onAdd,
  onEdit,
}: {
  label: string;
  mealKey: MealKey;
  items: LogItem[];
  onAdd: (meal: MealKey) => void;
  onEdit: (item: LogItem) => void;
}) {
  const subtotal = Math.round(items.reduce((a, i) => a + i.caloriesKcal, 0));

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-fg">{label}</h3>
          {items.length > 0 && (
            <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] tabular-nums text-muted">
              {subtotal} kcal
            </span>
          )}
        </div>
        <button
          onClick={() => onAdd(mealKey)}
          aria-label={`Pridať do ${label}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-inset ring-accent/20 transition active:scale-90"
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </header>

      {items.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onEdit(item)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition active:bg-surface-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg">{item.name}</p>
                  <p className="truncate text-xs text-muted">
                    {item.portionG} g{item.brand ? ` · ${item.brand}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-white">
                  {Math.round(item.caloriesKcal)}
                  <span className="text-xs font-normal text-muted"> kcal</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
