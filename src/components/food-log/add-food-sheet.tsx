"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Sheet } from "@/components/ui/sheet";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { MEALS, type FoodResult, type FoodSource, type MealKey, type RecentFood } from "./types";

type Tab = "search" | "scan" | "custom";

const inp =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-fg outline-none transition focus:border-accent";

const emptyCustom = {
  name: "",
  brand: "",
  caloriesKcal: "",
  proteinG: "",
  carbsG: "",
  fatG: "",
  servingSizeG: "",
};

function Badge({ source }: { source: FoodSource }) {
  if (source === "AI_ESTIMATED")
    return <span className="rounded-full bg-carbs/15 px-2 py-0.5 text-[11px] font-medium text-carbs">AI odhad</span>;
  if (source === "CUSTOM")
    return <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">Vlastné</span>;
  return <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">Overené</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

export function AddFoodSheet({
  meal,
  recent,
  onClose,
  onAdded,
}: {
  meal: MealKey;
  recent: RecentFood[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const mealLabel = MEALS.find((m) => m.key === meal)?.label ?? "";

  const [tab, setTab] = useState<Tab>("search");
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [portion, setPortion] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [custom, setCustom] = useState(emptyCustom);

  // Debounced textové vyhľadávanie.
  useEffect(() => {
    if (tab !== "search" || selected) return;
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, tab, selected]);

  function recentToFood(r: RecentFood): FoodResult {
    return {
      id: r.foodId,
      barcode: null,
      name: r.name,
      brand: r.brand,
      source: r.source,
      complete: true,
      caloriesKcal: r.caloriesKcal,
      proteinG: r.proteinG,
      carbsG: r.carbsG,
      fatG: r.fatG,
      fiberG: null,
      sugarG: null,
      saltG: null,
      servingSizeG: r.servingSizeG,
    };
  }

  // Výber z hľadania – ak nemá id (prechodný OFF hit), doriešime cez barcode (cache + AI).
  async function pickResult(food: FoodResult) {
    setError("");
    if (food.id) {
      setSelected(food);
      setPortion(food.servingSizeG ?? 100);
      return;
    }
    if (!food.barcode) {
      setError("Produkt sa nedá pridať (chýba kód).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/foods/barcode/${encodeURIComponent(food.barcode)}`);
      if (!res.ok) throw new Error("Nepodarilo sa načítať produkt.");
      const data = await res.json();
      setSelected(data.result);
      setPortion(data.result.servingSizeG ?? 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setBusy(false);
    }
  }

  async function handleScan(code: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/foods/barcode/${encodeURIComponent(code)}`);
      if (res.status === 404) {
        setError("Produkt sa nenašiel. Skús hľadať podľa názvu alebo Vlastné.");
        return;
      }
      if (!res.ok) throw new Error("Vyhľadanie zlyhalo.");
      const data = await res.json();
      setSelected(data.result);
      setPortion(data.result.servingSizeG ?? 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCustom(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: custom.name.trim(),
        brand: custom.brand.trim() || null,
        caloriesKcal: Number(custom.caloriesKcal),
        proteinG: Number(custom.proteinG),
        carbsG: Number(custom.carbsG),
        fatG: Number(custom.fatG),
        servingSizeG: custom.servingSizeG ? Number(custom.servingSizeG) : null,
      };
      const res = await fetch("/api/foods/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Uloženie zlyhalo.");
      const data = await res.json();
      setSelected(data.food);
      setPortion(payload.servingSizeG ?? 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmAdd() {
    if (!selected?.id) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodId: selected.id, mealType: meal, portionG: portion }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Zápis zlyhal.");
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
      setBusy(false);
    }
  }

  const f = (portion || 0) / 100;
  const scale = (v: number | null) => (v == null ? "—" : Math.round(v * f));

  return (
    <Sheet open onClose={onClose} title={selected ? "Pridať do dňa" : `Pridať – ${mealLabel}`}>
      {selected ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium leading-tight">{selected.name}</p>
                {selected.brand && <p className="text-xs text-muted">{selected.brand}</p>}
              </div>
              <Badge source={selected.source} />
            </div>
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
                {scale(selected.caloriesKcal)} <span className="text-xs font-normal text-muted">kcal</span>
              </div>
            </div>
            <div className="mt-2 flex gap-3 text-xs text-muted">
              <span>
                <span className="text-protein">{scale(selected.proteinG)} g</span> biel.
              </span>
              <span>
                <span className="text-carbs">{scale(selected.carbsG)} g</span> sach.
              </span>
              <span>
                <span className="text-fat">{scale(selected.fatG)} g</span> tuky
              </span>
            </div>
          </div>

          {error && <p className="text-sm text-protein">{error}</p>}

          <button
            disabled={busy || !(portion > 0)}
            onClick={confirmAdd}
            className="w-full rounded-2xl bg-accent py-3 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? "Pridávam…" : `Pridať do ${mealLabel}`}
          </button>
          <button
            disabled={busy}
            onClick={() => {
              setSelected(null);
              setError("");
            }}
            className="w-full rounded-2xl border border-border bg-surface-2 py-2.5 text-sm font-medium transition active:scale-[0.99]"
          >
            ← Späť na výber
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
            {(["search", "scan", "custom"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setError("");
                }}
                className={`rounded-xl py-2 text-sm font-medium transition ${
                  tab === t ? "bg-accent text-accent-fg" : "text-muted"
                }`}
              >
                {t === "search" ? "Hľadať" : t === "scan" ? "Skenovať" : "Vlastné"}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-protein">{error}</p>}

          {tab === "search" && (
            <div className="space-y-3">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Hľadať potravinu… (napr. Milka)"
                className={inp}
              />

              {q.trim().length < 2 && recent.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted">Posledné</p>
                  {recent.map((r) => (
                    <button
                      key={r.foodId}
                      disabled={busy}
                      onClick={() => pickResult(recentToFood(r))}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition active:bg-surface-2"
                    >
                      <span className="truncate text-sm">{r.name}</span>
                      <span className="ml-2 shrink-0 text-xs text-muted">{r.lastPortionG} g</span>
                    </button>
                  ))}
                </div>
              )}

              {searching && <p className="text-sm text-muted">Hľadám…</p>}

              <div className="space-y-1.5">
                {results.map((r, idx) => (
                  <button
                    key={`${r.barcode ?? r.name}-${idx}`}
                    disabled={busy}
                    onClick={() => pickResult(r)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition active:bg-surface-2 disabled:opacity-60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{r.name}</span>
                      {r.brand && <span className="block truncate text-xs text-muted">{r.brand}</span>}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted">
                      {r.caloriesKcal != null ? `${Math.round(r.caloriesKcal)} kcal/100g` : "—"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "scan" && (
            <div className="space-y-3">
              <BarcodeScanner onDetected={handleScan} onError={(m) => setError(m)} />
              {busy && <p className="text-sm text-muted">Hľadám produkt…</p>}
            </div>
          )}

          {tab === "custom" && (
            <form onSubmit={submitCustom} className="space-y-3">
              <Field label="Názov *">
                <input
                  required
                  value={custom.name}
                  onChange={(e) => setCustom({ ...custom, name: e.target.value })}
                  className={inp}
                />
              </Field>
              <Field label="Značka">
                <input
                  value={custom.brand}
                  onChange={(e) => setCustom({ ...custom, brand: e.target.value })}
                  className={inp}
                />
              </Field>
              <p className="pt-1 text-xs text-muted">Hodnoty na 100 g:</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Kalórie (kcal) *">
                  <input
                    required
                    inputMode="decimal"
                    value={custom.caloriesKcal}
                    onChange={(e) => setCustom({ ...custom, caloriesKcal: e.target.value })}
                    className={inp}
                  />
                </Field>
                <Field label="Bielkoviny (g) *">
                  <input
                    required
                    inputMode="decimal"
                    value={custom.proteinG}
                    onChange={(e) => setCustom({ ...custom, proteinG: e.target.value })}
                    className={inp}
                  />
                </Field>
                <Field label="Sacharidy (g) *">
                  <input
                    required
                    inputMode="decimal"
                    value={custom.carbsG}
                    onChange={(e) => setCustom({ ...custom, carbsG: e.target.value })}
                    className={inp}
                  />
                </Field>
                <Field label="Tuky (g) *">
                  <input
                    required
                    inputMode="decimal"
                    value={custom.fatG}
                    onChange={(e) => setCustom({ ...custom, fatG: e.target.value })}
                    className={inp}
                  />
                </Field>
              </div>
              <Field label="Bežná porcia (g)">
                <input
                  inputMode="decimal"
                  value={custom.servingSizeG}
                  onChange={(e) => setCustom({ ...custom, servingSizeG: e.target.value })}
                  placeholder="napr. 30"
                  className={inp}
                />
              </Field>
              <button
                disabled={busy}
                type="submit"
                className="w-full rounded-2xl bg-accent py-3 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
              >
                {busy ? "Ukladám…" : "Pokračovať"}
              </button>
            </form>
          )}
        </div>
      )}
    </Sheet>
  );
}
