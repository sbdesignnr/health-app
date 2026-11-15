"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Plus, Star } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { FoodIcon } from "./food-icon";
import {
  MEALS,
  type FavoriteFood,
  type FoodResult,
  type FoodSource,
  type MealKey,
  type RecentFood,
  type ServingUnit,
} from "./types";

type Tab = "fav" | "search" | "scan" | "custom";

const TAB_LABEL: Record<Tab, string> = {
  fav: "Obľúbené",
  search: "Hľadať",
  scan: "Skenovať",
  custom: "Vlastné",
};

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
  if (source === "CURATED")
    return <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">Databáza</span>;
  if (source === "AI_ESTIMATED")
    return <span className="rounded-full bg-carbs/15 px-2 py-0.5 text-[11px] font-medium text-carbs">AI odhad</span>;
  if (source === "CUSTOM")
    return <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">Vlastné</span>;
  return <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">Značka</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

// Zoznam jednotiek pre daný výsledok: základná (g/ml) + definované porcie/kusy.
function unitsFor(food: FoodResult | RecentFood): ServingUnit[] {
  const base = "baseUnit" in food ? food.baseUnit : "g";
  const extra = "servingUnits" in food ? (food.servingUnits ?? []) : [];
  return [{ label: base, grams: 1 }, ...extra];
}

export function AddFoodSheet({
  meal,
  date,
  recent,
  onClose,
  onAdded,
}: {
  meal: MealKey;
  date: string;
  recent: RecentFood[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const isPastOrFuture = date !== todayStr;
  const mealLabel = MEALS.find((m) => m.key === meal)?.label ?? "";

  const [tab, setTab] = useState<Tab>("search");
  const [selected, setSelected] = useState<FoodResult | null>(null);

  // výber jednotky
  const [unitIdx, setUnitIdx] = useState(0);
  const [qty, setQty] = useState("1");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [custom, setCustom] = useState(emptyCustom);
  const [aiEstimating, setAiEstimating] = useState(false);

  // ── obľúbené potraviny (rýchly zápis bez vyhľadávania) ──
  const [favorites, setFavorites] = useState<FavoriteFood[]>([]);
  const [favBusy, setFavBusy] = useState("");
  const tabTouched = useRef(false);

  const favIds = useMemo(() => new Set(favorites.map((f) => f.food.id)), [favorites]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/foods/favorites");
        if (!res.ok) return;
        const list: FavoriteFood[] = (await res.json()).favorites ?? [];
        if (cancelled) return;
        setFavorites(list);
        // ak už nejaké má, otvor rovno Obľúbené – práve preto, aby nemusel stále hľadať
        if (!tabTouched.current && list.length > 0) setTab("fav");
      } catch {
        /* obľúbené sú len skratka, bez nich appka funguje ďalej */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function switchTab(t: Tab) {
    tabTouched.current = true;
    setTab(t);
    setError("");
  }

  // Hviezdička: pridá/odoberie potravinu z obľúbených (aj s aktuálnou porciou).
  async function toggleFavorite(foodId: string, portionG?: number) {
    if (!foodId) return;
    setFavBusy(foodId);
    try {
      if (favIds.has(foodId)) {
        const res = await fetch(`/api/foods/favorites?foodId=${encodeURIComponent(foodId)}`, {
          method: "DELETE",
        });
        if (res.ok) setFavorites((prev) => prev.filter((f) => f.food.id !== foodId));
        return;
      }
      const res = await fetch("/api/foods/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodId, defaultPortionG: portionG ?? null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Uloženie zlyhalo.");
      const { favorite } = await res.json();
      setFavorites((prev) => [...prev.filter((f) => f.food.id !== foodId), favorite]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setFavBusy("");
    }
  }

  // Zápis obľúbenej potraviny jedným ťuknutím (s uloženou porciou).
  async function quickAddFavorite(fav: FavoriteFood) {
    if (!fav.food.id) return;
    setFavBusy(fav.food.id);
    setError("");
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodId: fav.food.id,
          mealType: meal,
          portionG: Math.round(fav.defaultPortionG),
          loggedAt: isPastOrFuture ? `${date}T12:00:00Z` : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Zápis zlyhal.");
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
      setFavBusy("");
    }
  }

  async function askAi() {
    const term = q.trim();
    if (term.length < 2) return;
    setAiEstimating(true);
    setError("");
    try {
      const res = await fetch("/api/foods/ai-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: term }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "AI odhad zlyhal.");
      const { result } = await res.json();
      selectFood(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setAiEstimating(false);
    }
  }

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
    let cancelled = false;
    const t = setTimeout(async () => {
      // 1. vlna – lokálny katalóg + vlastné (okamžite)
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(term)}&mode=local`);
        const data = await res.json();
        if (!cancelled) setResults(Array.isArray(data.results) ? data.results : []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
      // 2. vlna – značkové produkty z Open Food Facts (doplní sa nižšie)
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(term)}&mode=off`);
        const data = await res.json();
        if (cancelled || !Array.isArray(data.results)) return;
        setResults((prev) => {
          const seen = new Set(prev.map((r) => `${r.name.toLowerCase()}|${r.brand?.toLowerCase() ?? ""}`));
          const extra = (data.results as FoodResult[]).filter(
            (r) => !seen.has(`${r.name.toLowerCase()}|${r.brand?.toLowerCase() ?? ""}`),
          );
          return [...prev, ...extra];
        });
      } catch {
        /* OFF je len doplnok */
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, tab, selected]);

  const units = useMemo(() => (selected ? unitsFor(selected) : [{ label: "g", grams: 1 }]), [selected]);
  const unitGrams = units[unitIdx]?.grams ?? 1;
  const grams = Math.max(0, (Number(qty.replace(",", ".")) || 0) * unitGrams);

  // Po výbere potraviny nastav rozumnú predvolenú jednotku.
  function initPortion(food: FoodResult) {
    const u = unitsFor(food);
    if (u.length > 1) {
      // má kusy/porcie → predvoľ prvú porciu, množstvo 1
      setUnitIdx(1);
      setQty("1");
    } else {
      setUnitIdx(0);
      setQty(String(food.servingSizeG ?? 100));
    }
  }

  function recentToFood(r: RecentFood): FoodResult {
    return {
      id: r.foodId,
      catalogSlug: null,
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
      category: r.category,
      baseUnit: r.baseUnit,
      servingUnits: r.servingUnits,
      imageUrl: null,
    };
  }

  function selectFood(food: FoodResult) {
    setSelected(food);
    initPortion(food);
  }

  // Výber z hľadania – kurátorované/OFF prechodné položky doriešime na foodId.
  async function pickResult(food: FoodResult) {
    setError("");
    if (food.id) {
      selectFood(food);
      return;
    }
    setBusy(true);
    try {
      if (food.catalogSlug) {
        const res = await fetch("/api/foods/catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: food.catalogSlug }),
        });
        if (!res.ok) throw new Error("Nepodarilo sa načítať potravinu.");
        selectFood((await res.json()).result);
      } else if (food.barcode) {
        const res = await fetch(`/api/foods/barcode/${encodeURIComponent(food.barcode)}`);
        if (!res.ok) throw new Error("Nepodarilo sa načítať produkt.");
        selectFood((await res.json()).result);
      } else {
        setError("Produkt sa nedá pridať (chýba kód).");
      }
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
      selectFood((await res.json()).result);
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
      selectFood((await res.json()).food);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmAdd() {
    if (!selected?.id || !(grams > 0)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodId: selected.id,
          mealType: meal,
          portionG: Math.round(grams),
          loggedAt: isPastOrFuture ? `${date}T12:00:00Z` : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Zápis zlyhal.");
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
      setBusy(false);
    }
  }

  const f = grams / 100;
  const scale = (v: number | null) => (v == null ? "—" : Math.round(v * f));
  const dateSuffix = isPastOrFuture ? ` (${date.split("-").reverse().slice(0, 2).join(".")}.)` : "";

  return (
    <Sheet
      open
      onClose={onClose}
      title={selected ? `Pridať do dňa${dateSuffix}` : `Pridať – ${mealLabel}${dateSuffix}`}
    >
      {selected ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start gap-3">
              <FoodIcon category={selected.category} imageUrl={selected.imageUrl} size={44} />
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{selected.name}</p>
                {selected.brand && <p className="text-xs text-muted">{selected.brand}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Badge source={selected.source} />
                {selected.id && (
                  <button
                    onClick={() => toggleFavorite(selected.id!, Math.round(grams) || undefined)}
                    disabled={favBusy === selected.id}
                    aria-label={favIds.has(selected.id) ? "Odobrať z obľúbených" : "Pridať do obľúbených"}
                    className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-[11px] font-medium transition active:scale-95 disabled:opacity-60"
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${favIds.has(selected.id) ? "fill-accent text-accent" : "text-muted"}`}
                      strokeWidth={2}
                    />
                    <span className={favIds.has(selected.id) ? "text-accent" : "text-muted"}>
                      {favIds.has(selected.id) ? "Obľúbené" : "Uložiť"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* výber jednotky */}
            {units.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {units.map((u, i) => (
                  <button
                    key={u.label}
                    onClick={() => {
                      setUnitIdx(i);
                      setQty(i === 0 ? String(selected.servingSizeG ?? 100) : "1");
                    }}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                      unitIdx === i
                        ? "bg-accent text-accent-fg"
                        : "bg-surface-2 text-muted ring-1 ring-inset ring-border"
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={0}
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-24 rounded-xl border border-border bg-surface-2 px-3 py-2 text-right tabular-nums outline-none focus:border-accent"
              />
              <span className="text-sm text-muted">
                {units[unitIdx]?.label}
                {unitIdx > 0 && <span className="ml-1 text-muted/70">≈ {Math.round(grams)} g</span>}
              </span>
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
            disabled={busy || !(grams > 0)}
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
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1">
            {(["fav", "search", "scan", "custom"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`rounded-xl py-2 text-[13px] font-medium transition ${
                  tab === t ? "bg-accent text-accent-fg" : "text-muted"
                }`}
              >
                {TAB_LABEL[t]}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-protein">{error}</p>}

          {tab === "fav" && (
            <div className="space-y-2">
              {favorites.length === 0 ? (
                <div className="space-y-2.5 py-6 text-center">
                  <Star className="mx-auto h-8 w-8 text-muted/50" strokeWidth={1.5} />
                  <p className="text-sm font-medium">Zatiaľ žiadne obľúbené</p>
                  <p className="mx-auto max-w-[34ch] text-xs leading-relaxed text-muted">
                    Nájdi potravinu v „Hľadať“ a pri výbere porcie ťukni na hviezdičku{" "}
                    <Star className="inline h-3 w-3 text-accent" strokeWidth={2} /> — nabudúce ju zapíšeš
                    jedným ťuknutím bez hľadania.
                  </p>
                  <button
                    onClick={() => switchTab("search")}
                    className="mx-auto mt-1 rounded-xl bg-surface-2 px-4 py-2 text-sm font-medium transition active:scale-95"
                  >
                    Hľadať potravinu
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted">
                    Ťukni na položku pre úpravu porcie, alebo rovno na <span className="text-accent">+</span>{" "}
                    pre okamžitý zápis.
                  </p>
                  {favorites.map((fav) => (
                    <div
                      key={fav.favoriteId}
                      className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5"
                    >
                      <button
                        disabled={busy || favBusy === fav.food.id}
                        onClick={() => {
                          selectFood(fav.food);
                          setUnitIdx(0);
                          setQty(String(Math.round(fav.defaultPortionG)));
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left transition active:opacity-70 disabled:opacity-60"
                      >
                        <FoodIcon category={fav.food.category} imageUrl={fav.food.imageUrl} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{fav.food.name}</span>
                          <span className="block truncate text-xs text-muted tabular-nums">
                            {Math.round(fav.defaultPortionG)} g ·{" "}
                            {Math.round(((fav.food.caloriesKcal ?? 0) * fav.defaultPortionG) / 100)} kcal
                          </span>
                        </span>
                      </button>
                      <button
                        onClick={() => fav.food.id && toggleFavorite(fav.food.id)}
                        disabled={favBusy === fav.food.id}
                        aria-label="Odobrať z obľúbených"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition active:scale-90 disabled:opacity-60"
                      >
                        <Star className="h-4 w-4 fill-accent text-accent" strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => quickAddFavorite(fav)}
                        disabled={favBusy === fav.food.id}
                        aria-label={`Zapísať ${fav.food.name}`}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg transition active:scale-90 disabled:opacity-60"
                      >
                        <Plus className="h-4.5 w-4.5" strokeWidth={2.6} />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {tab === "search" && (
            <div className="space-y-3">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Hľadať potravinu… (napr. vajce, kuracie, ryža)"
                className={inp}
              />

              {q.trim().length < 2 && recent.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted">Posledné</p>
                  {recent.map((r) => (
                    <div
                      key={r.foodId}
                      className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5"
                    >
                      <button
                        disabled={busy}
                        onClick={() => pickResult(recentToFood(r))}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left transition active:opacity-70"
                      >
                        <FoodIcon category={r.category} size={36} />
                        <span className="min-w-0 flex-1 truncate text-sm">{r.name}</span>
                        <span className="ml-2 shrink-0 text-xs text-muted">{r.lastPortionG} g</span>
                      </button>
                      <button
                        onClick={() => toggleFavorite(r.foodId, r.lastPortionG)}
                        disabled={favBusy === r.foodId}
                        aria-label={
                          favIds.has(r.foodId) ? "Odobrať z obľúbených" : "Pridať do obľúbených"
                        }
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition active:scale-90 disabled:opacity-60"
                      >
                        <Star
                          className={`h-4 w-4 ${favIds.has(r.foodId) ? "fill-accent text-accent" : "text-muted"}`}
                          strokeWidth={2}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searching && results.length === 0 && <p className="text-sm text-muted">Hľadám…</p>}

              <div className="space-y-1.5">
                {results.map((r, idx) => (
                  <button
                    key={`${r.catalogSlug ?? r.barcode ?? r.name}-${idx}`}
                    disabled={busy}
                    onClick={() => pickResult(r)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition active:bg-surface-2 disabled:opacity-60"
                  >
                    <FoodIcon category={r.category} imageUrl={r.imageUrl} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{r.name}</span>
                      {r.brand && <span className="block truncate text-xs text-muted">{r.brand}</span>}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-xs tabular-nums text-muted">
                        {r.caloriesKcal != null ? `${Math.round(r.caloriesKcal)} kcal` : "—"}
                      </span>
                      <span className="text-[10px] text-muted/70">/100 {r.baseUnit}</span>
                    </span>
                  </button>
                ))}
                {!searching && q.trim().length >= 2 && results.length === 0 && (
                  <div className="space-y-2.5 py-2 text-center">
                    <p className="text-sm text-muted">Nič sa nenašlo v databáze.</p>
                    <button
                      onClick={askAi}
                      disabled={aiEstimating}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-carbs/15 py-2.5 text-sm font-semibold text-carbs transition active:scale-[0.98] disabled:opacity-60"
                    >
                      {aiEstimating ? "AI odhaduje…" : `Opýtať sa AI na "${q.trim()}"`}
                    </button>
                    <p className="text-xs text-muted">alebo pridaj cez „Vlastné“</p>
                  </div>
                )}
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
