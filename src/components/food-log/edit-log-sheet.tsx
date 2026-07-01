"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { MEALS, type LogItem, type MealKey } from "./types";

export function EditLogSheet({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: LogItem;
  onClose: () => void;
  onSave: (id: string, patch: { portionG: number; mealType: MealKey }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [portion, setPortion] = useState(item.portionG);
  const [meal, setMeal] = useState<MealKey>(item.mealType);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Per-100g odvodíme zo snapshotu záznamu, prepočítame na novú porciu.
  const per100 = (v: number) => (item.portionG > 0 ? v / (item.portionG / 100) : 0);
  const scaled = (v: number) => Math.round(per100(v) * ((portion || 0) / 100));

  return (
    <Sheet open onClose={onClose} title="Upraviť záznam">
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="font-medium">{item.name}</p>
          {item.brand && <p className="text-xs text-muted">{item.brand}</p>}
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={portion}
              onChange={(e) => setPortion(Number(e.target.value))}
              className="w-24 rounded-xl border border-border bg-surface-2 px-3 py-2 text-right tabular-nums outline-none focus:border-accent"
            />
            <span className="text-sm text-muted">g</span>
            <div className="ml-auto text-lg font-semibold tabular-nums">
              {scaled(item.caloriesKcal)} <span className="text-xs font-normal text-muted">kcal</span>
            </div>
          </div>
          <div className="mt-2 flex gap-3 text-xs text-muted">
            <span>
              <span className="text-protein">{scaled(item.proteinG)} g</span> biel.
            </span>
            <span>
              <span className="text-carbs">{scaled(item.carbsG)} g</span> sach.
            </span>
            <span>
              <span className="text-fat">{scaled(item.fatG)} g</span> tuky
            </span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs text-muted">Jedlo</p>
          <div className="flex flex-wrap gap-1.5">
            {MEALS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMeal(m.key)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  meal === m.key
                    ? "bg-accent text-accent-fg"
                    : "border border-border bg-surface text-muted"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <button
          disabled={busy || !(portion > 0)}
          onClick={async () => {
            setBusy(true);
            await onSave(item.id, { portionG: portion, mealType: meal });
          }}
          className="w-full rounded-2xl bg-accent py-3 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? "Ukladám…" : "Uložiť"}
        </button>

        {/* Zmazať – jednoznačné deštruktívne tlačidlo s 2-krokovým potvrdením */}
        {!confirming ? (
          <button
            disabled={busy}
            onClick={() => setConfirming(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-protein/40 bg-protein/10 py-3 text-sm font-semibold text-protein transition active:scale-[0.99] disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Zmazať záznam
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-2xl border border-border bg-surface-2 py-3 text-sm font-medium transition active:scale-[0.99]"
            >
              Zrušiť
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onDelete(item.id);
              }}
              className="flex-1 rounded-2xl bg-protein py-3 text-sm font-semibold text-bg transition active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? "Mažem…" : "Naozaj zmazať"}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
