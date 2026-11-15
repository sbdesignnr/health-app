"use client";

import { useState } from "react";
import { Check, Plus, Star } from "lucide-react";
import { FoodIcon } from "./food-icon";
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

  // Uloženie celého jedla ako obľúbenej kombinácie (nabudúce jedno ťuknutie).
  const [saving, setSaving] = useState(false);
  const [comboName, setComboName] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveCombo() {
    const name = comboName.trim() || items.map((i) => i.name).join(" + ").slice(0, 80);
    setBusy(true);
    try {
      const res = await fetch("/api/foods/combos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mealType: mealKey,
          items: items.map((i) => ({ foodId: i.foodId, portionG: i.portionG })),
        }),
      });
      if (res.ok) {
        setSaved(true);
        setSaving(false);
        setComboName("");
        setTimeout(() => setSaved(false), 2200);
      }
    } finally {
      setBusy(false);
    }
  }

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
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-surface-2"
              >
                <FoodIcon category={item.category} size={36} />
                <div className="min-w-0 flex-1">
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

      {items.length > 1 && (
        <div className="border-t border-border px-4 py-2.5">
          {saving ? (
            <div className="flex gap-2">
              <input
                value={comboName}
                onChange={(e) => setComboName(e.target.value)}
                placeholder={items.map((i) => i.name).join(" + ").slice(0, 40)}
                autoFocus
                className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg outline-none transition placeholder:text-muted/60 focus:border-accent"
              />
              <button
                onClick={saveCombo}
                disabled={busy}
                className="shrink-0 rounded-xl bg-accent px-3 text-xs font-semibold text-accent-fg transition active:scale-95 disabled:opacity-60"
              >
                {busy ? "…" : "Uložiť"}
              </button>
              <button
                onClick={() => setSaving(false)}
                className="shrink-0 rounded-xl bg-surface-2 px-3 text-xs font-medium text-muted transition active:scale-95"
              >
                Zrušiť
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSaving(true)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-muted transition active:opacity-70"
            >
              {saved ? (
                <>
                  <Check className="h-3 w-3 text-accent" strokeWidth={3} />
                  <span className="text-accent">Uložené medzi obľúbené</span>
                </>
              ) : (
                <>
                  <Star className="h-3 w-3" strokeWidth={2} />
                  Uložiť celé jedlo ako obľúbené
                </>
              )}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
