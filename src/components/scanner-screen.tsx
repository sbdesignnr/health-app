"use client";

import { useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { ScanBarcode, ArrowRight, Check, Plus, RotateCcw, PackageX, TriangleAlert } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { BarcodeScanner } from "./barcode-scanner";
import { MEALS, type MealKey } from "@/components/food-log/types";

type FoodResult = {
  id: string | null;
  barcode: string | null;
  name: string;
  brand: string | null;
  source: "OFF_VERIFIED" | "AI_ESTIMATED" | "CUSTOM";
  complete: boolean;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  saltG: number | null;
  servingSizeG: number | null;
};

type Status = "idle" | "scanning" | "loading" | "result" | "notfound" | "error";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.025, delayChildren: 0.02 } },
};
const fade: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

function defaultMeal(): MealKey {
  const h = new Date().getHours();
  if (h < 10) return "BREAKFAST";
  if (h < 11) return "MORNING_SNACK";
  if (h < 15) return "LUNCH";
  if (h < 18) return "AFTERNOON_SNACK";
  return "DINNER";
}

function SourceBadge({ source }: { source: FoodResult["source"] }) {
  if (source === "AI_ESTIMATED") {
    return (
      <span className="shrink-0 rounded-full bg-warn/15 px-2.5 py-1 text-[11px] font-medium text-warn ring-1 ring-inset ring-warn/25">
        AI odhad
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-medium text-accent ring-1 ring-inset ring-accent/25">
      Overené · OFF
    </span>
  );
}

function MacroTile({ label, value, color }: { label: string; value: number | null; color?: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-2 py-3 text-center">
      <div
        className={`text-lg font-bold tabular-nums ${color ? "" : "text-white"}`}
        style={color ? { color } : undefined}
      >
        {value == null ? "—" : value}
      </div>
      <div className="label-caps mt-1 flex justify-center">{label}</div>
    </div>
  );
}

export function ScannerScreen() {
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<FoodResult | null>(null);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [portion, setPortion] = useState(100);

  const [meal, setMeal] = useState<MealKey>(defaultMeal);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  async function lookup(code: string) {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch(`/api/foods/barcode/${encodeURIComponent(code)}`);
      if (res.status === 404) {
        setStatus("notfound");
        return;
      }
      if (!res.ok) throw new Error("Vyhľadanie zlyhalo.");
      const data: { result: FoodResult } = await res.json();
      setResult(data.result);
      setPortion(data.result.servingSizeG ?? 100);
      setAdded(false);
      setMeal(defaultMeal());
      setStatus("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nastala chyba.");
      setStatus("error");
    }
  }

  async function addToLog() {
    if (!result?.id) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodId: result.id, mealType: meal, portionG: portion }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Zápis zlyhal.");
      setAdded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setAdding(false);
    }
  }

  function reset() {
    setResult(null);
    setError("");
    setManual("");
    setPortion(100);
    setAdded(false);
    setStatus("idle");
  }

  const factor = (portion || 0) / 100;
  const scale = (v: number | null) => (v == null ? null : Math.round(v * factor));
  const sheetOpen = status === "loading" || status === "result" || status === "notfound" || status === "error";

  return (
    <div className="space-y-5 pt-3">
      <div>
        <p className="label-caps">Skener</p>
        <h1 className="mt-1 text-[28px] font-bold leading-none tracking-tight text-white">
          Skenovať potravinu
        </h1>
      </div>

      {status === "scanning" ? (
        <motion.div
          className="space-y-3"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <BarcodeScanner
            onDetected={lookup}
            onError={(m) => {
              setError(m);
              setStatus("error");
            }}
          />
          <button
            onClick={reset}
            className="w-full rounded-card border border-border bg-surface-2 py-3.5 font-medium transition active:scale-[0.99]"
          >
            Zrušiť
          </button>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-4"
          variants={container}
          initial={reduce ? false : "hidden"}
          animate="show"
        >
          {/* veľký viewfinder štart */}
          <motion.button
            variants={fade}
            onClick={() => setStatus("scanning")}
            className="card relative flex aspect-[5/4] w-full flex-col items-center justify-center gap-4 overflow-hidden transition active:scale-[0.99]"
          >
            <div className="pointer-events-none absolute inset-4">
              <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-2 border-t-2 border-accent/40" />
              <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-2 border-t-2 border-accent/40" />
              <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-2 border-l-2 border-accent/40" />
              <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-2 border-r-2 border-accent/40" />
            </div>
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 ring-1 ring-inset ring-accent/20">
              <ScanBarcode className="h-8 w-8 text-accent" strokeWidth={1.5} />
            </div>
            <div className="relative text-center">
              <p className="font-semibold text-white">Spustiť skener</p>
              <p className="mt-0.5 text-xs text-muted">Namier kameru na čiarový kód</p>
            </div>
          </motion.button>

          {/* oddeľovač */}
          <motion.div variants={fade} className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="label-caps">alebo</span>
            <div className="h-px flex-1 bg-border" />
          </motion.div>

          {/* ručné zadanie kódu */}
          <motion.form
            variants={fade}
            onSubmit={(e) => {
              e.preventDefault();
              if (manual.trim()) lookup(manual.trim());
            }}
            className="flex gap-2"
          >
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              inputMode="numeric"
              placeholder="Zadaj kód ručne (napr. 3017620422003)"
              className="min-w-0 flex-1 rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm text-fg outline-none transition placeholder:text-muted/70 focus:border-accent"
            />
            <button
              type="submit"
              aria-label="Hľadať"
              className="grid w-[52px] shrink-0 place-items-center rounded-2xl bg-accent text-accent-fg transition active:scale-95"
            >
              <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
            </button>
          </motion.form>
        </motion.div>
      )}

      {/* ── výsledok / stavy v slide-up sheete ── */}
      <Sheet open={sheetOpen} onClose={reset}>
        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <motion.span
              className="h-8 w-8 rounded-full border-2 border-border border-t-accent"
              animate={reduce ? undefined : { rotate: 360 }}
              transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
            />
            <p className="text-sm text-muted">Hľadám produkt…</p>
          </div>
        )}

        {status === "result" && result && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold leading-tight text-white">{result.name}</h2>
                {result.brand && <p className="mt-0.5 text-sm text-muted">{result.brand}</p>}
              </div>
              <SourceBadge source={result.source} />
            </div>

            {/* porcia stepper */}
            <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-3 py-2">
              <span className="label-caps">Porcia</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPortion((p) => Math.max(1, (p || 0) - 10))}
                  className="grid h-8 w-8 place-items-center rounded-lg text-lg text-muted transition active:scale-90"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={portion}
                  onChange={(e) => setPortion(Number(e.target.value))}
                  className="w-14 bg-transparent text-center text-base font-bold tabular-nums text-white outline-none"
                />
                <span className="text-sm text-muted">g</span>
                <button
                  onClick={() => setPortion((p) => (p || 0) + 10)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-lg text-muted transition active:scale-90"
                >
                  +
                </button>
              </div>
            </div>

            {/* makrá */}
            <div className="grid grid-cols-4 gap-2">
              <MacroTile label="kcal" value={scale(result.caloriesKcal)} />
              <MacroTile label="Biel." value={scale(result.proteinG)} color="var(--color-protein)" />
              <MacroTile label="Sach." value={scale(result.carbsG)} color="var(--color-carbs)" />
              <MacroTile label="Tuky" value={scale(result.fatG)} color="var(--color-fat)" />
            </div>

            {result.source === "AI_ESTIMATED" && (
              <p className="flex items-start gap-1.5 text-xs text-warn/90">
                <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                Hodnoty sú AI odhad – Open Food Facts nemal kompletné makrá.
              </p>
            )}

            {/* výber jedla */}
            <div className="space-y-2">
              <p className="label-caps">Pridať do</p>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {MEALS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMeal(m.key)}
                    className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-95 ${
                      meal === m.key
                        ? "bg-accent text-accent-fg"
                        : "bg-surface-2 text-muted ring-1 ring-inset ring-border"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-inset ring-error/20">
                {error}
              </p>
            )}

            {result.id ? (
              <button
                onClick={addToLog}
                disabled={adding || added || !(portion > 0)}
                className={`flex w-full items-center justify-center gap-2 rounded-card py-3.5 font-semibold transition active:scale-[0.99] disabled:opacity-100 ${
                  added ? "bg-accent/10 text-accent ring-1 ring-inset ring-accent/20" : "bg-accent text-accent-fg"
                }`}
              >
                {added ? (
                  <>
                    <Check className="h-[18px] w-[18px]" strokeWidth={2.5} /> Pridané do denníka
                  </>
                ) : (
                  <>
                    <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
                    {adding ? "Pridávam…" : `Pridať do ${MEALS.find((m) => m.key === meal)?.label ?? ""}`}
                  </>
                )}
              </button>
            ) : (
              <p className="rounded-card border border-dashed border-border py-3 text-center text-sm text-muted">
                Tento produkt sa nedá pridať (chýba záznam).
              </p>
            )}

            <button
              onClick={reset}
              className="flex w-full items-center justify-center gap-2 rounded-card border border-border bg-surface-2 py-3 text-sm font-medium transition active:scale-[0.99]"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={2} /> Skenovať ďalší
            </button>
          </div>
        )}

        {status === "notfound" && (
          <div className="space-y-4 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-2">
              <PackageX className="h-7 w-7 text-muted" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold text-white">Produkt sa nenašiel</p>
              <p className="mx-auto mt-1 max-w-[32ch] text-sm text-muted">
                Open Food Facts tento kód nepozná. Skús pridať jedlo ručne cez „Pridať“ na karte Dnes.
              </p>
            </div>
            <button
              onClick={reset}
              className="w-full rounded-card bg-accent py-3.5 font-semibold text-accent-fg transition active:scale-[0.99]"
            >
              Skúsiť znova
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-error/10">
              <TriangleAlert className="h-7 w-7 text-error" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold text-white">Nastala chyba</p>
              <p className="mx-auto mt-1 max-w-[32ch] text-sm text-muted">{error}</p>
            </div>
            <button
              onClick={reset}
              className="w-full rounded-card border border-border bg-surface-2 py-3.5 font-medium transition active:scale-[0.99]"
            >
              Späť
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
