"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { RefreshCw, Sparkles, Check, Plus, Clock, Pill, Lightbulb } from "lucide-react";
import { MEALS } from "@/components/food-log/types";
import { AnimatedNumber } from "@/components/ui/animated-number";

type Ingredient = { name: string; grams: number };

type PlanItem = {
  id: string;
  mealType: string;
  name: string;
  description: string | null;
  timeOfDay: string | null;
  ingredients: Ingredient[] | null;
  portionG: number | null;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sortOrder: number;
};

type Supplement = { name: string; timing: string; reason: string };

type Plan = {
  id: string;
  date: string;
  model: string;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  dailyTip: string | null;
  supplementPlan: Supplement[] | null;
  items: PlanItem[];
};

const MEAL_LABEL: Record<string, string> = Object.fromEntries(MEALS.map((m) => [m.key, m.label]));

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
};
const fade: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ── hlavička obrazovky ── */
function ScreenHeader() {
  return (
    <div>
      <p className="label-caps">Jedálniček</p>
      <h1 className="mt-1 text-[28px] font-bold leading-none tracking-tight text-white">
        AI plán na dnes
      </h1>
    </div>
  );
}

/* ── makro bar v súhrnnej karte ── */
function MacroBar({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const reduce = useReducedMotion();
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <div className="flex-1">
      <div className="flex items-baseline justify-between">
        <span className="label-caps">{label}</span>
        <span className="text-[11px] tabular-nums text-muted">
          <span className="font-semibold text-fg">{Math.round(value)}</span>/{Math.round(target)}
        </span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: reduce ? `${pct * 100}%` : "0%" }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: reduce ? 0 : 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
        />
      </div>
    </div>
  );
}

/* ── malý makro čip v karte jedla ── */
function MacroChip({ color, value, letter }: { color: string; value: number; letter: string }) {
  return (
    <span className="flex items-center gap-1 tabular-nums">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-fg">{Math.round(value)}</span>
      <span className="text-muted">{letter}</span>
    </span>
  );
}

export function MealPlanScreen() {
  const reduce = useReducedMotion();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [logged, setLogged] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const date = todayStr();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/meal-plan?date=${date}`);
        if (res.ok) setPlan((await res.json()).plan);
      } finally {
        setLoading(false);
      }
    })();
  }, [date]);

  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Generovanie zlyhalo.");
      setPlan((await res.json()).plan);
      setLogged(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setGenerating(false);
    }
  }

  async function swap(itemId: string) {
    setBusyItem(itemId);
    setError("");
    try {
      const res = await fetch("/api/meal-plan/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Výmena zlyhala.");
      const item: PlanItem = (await res.json()).item;
      setPlan((p) => (p ? { ...p, items: p.items.map((i) => (i.id === itemId ? item : i)) } : p));
      setLogged((s) => {
        const n = new Set(s);
        n.delete(itemId);
        return n;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setBusyItem(null);
    }
  }

  async function logItem(itemId: string) {
    setBusyItem(itemId);
    setError("");
    try {
      const res = await fetch("/api/meal-plan/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Pridanie zlyhalo.");
      setLogged((s) => new Set(s).add(itemId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setBusyItem(null);
    }
  }

  /* ── načítavanie ── */
  if (loading) {
    return (
      <div className="space-y-4 pt-3">
        <ScreenHeader />
        <div className="card h-28 p-5">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton mt-3 h-8 w-40 rounded" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="card space-y-3 p-4">
            <div className="skeleton h-2.5 w-16 rounded" />
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-3 w-full rounded" />
          </div>
        ))}
      </div>
    );
  }

  /* ── AI generuje (skeleton shimmer) ── */
  if (generating) {
    return (
      <div className="space-y-4 pt-3">
        <ScreenHeader />
        <div className="card flex items-center gap-3 p-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-accent/30 blur-md" />
            <Sparkles className="relative h-5 w-5 animate-pulse text-accent" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">AI skladá tvoj plán…</p>
            <p className="text-xs text-muted">Z tvojich cieľov, rozvrhu a počasia (pár sekúnd)</p>
          </div>
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card space-y-3 p-4">
            <div className="skeleton h-2.5 w-16 rounded" />
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="flex gap-2 pt-1">
              <div className="skeleton h-9 w-24 rounded-xl" />
              <div className="skeleton h-9 flex-1 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ── prázdny stav ── */
  if (!plan) {
    return (
      <motion.div
        className="space-y-5 pt-3"
        variants={container}
        initial={reduce ? false : "hidden"}
        animate="show"
      >
        <motion.div variants={fade}>
          <ScreenHeader />
        </motion.div>

        <motion.div variants={fade} className="card relative overflow-hidden p-7 text-center">
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 ring-1 ring-inset ring-accent/20">
            <Sparkles className="h-7 w-7 text-accent" strokeWidth={1.5} />
          </div>
          <p className="relative text-lg font-bold text-white">AI jedálniček na mieru</p>
          <p className="relative mx-auto mt-2 max-w-[34ch] text-sm leading-relaxed text-muted">
            Vygenerujem denný plán z tvojich cieľov (TDEE), rozvrhu, diéty/alergií, histórie jedál a
            počasia.
          </p>
        </motion.div>

        {error && (
          <motion.p
            variants={fade}
            className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error ring-1 ring-inset ring-error/20"
          >
            {error}
          </motion.p>
        )}

        <motion.button
          variants={fade}
          onClick={generate}
          className="flex w-full items-center justify-center gap-2 rounded-card bg-accent py-4 font-semibold text-accent-fg shadow-[0_0_24px_rgba(168,255,62,0.18)] transition active:scale-[0.98]"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2} />
          Vygenerovať plán na dnes
        </motion.button>
      </motion.div>
    );
  }

  const totals = plan.items.reduce(
    (a, i) => ({
      kcal: a.kcal + i.caloriesKcal,
      p: a.p + i.proteinG,
      c: a.c + i.carbsG,
      f: a.f + i.fatG,
    }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );

  return (
    <motion.div
      className="space-y-4 pb-4 pt-3"
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
    >
      <motion.div variants={fade}>
        <ScreenHeader />
      </motion.div>

      {/* ── súhrnná karta ── */}
      <motion.div variants={fade} className="card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <p className="label-caps">Plán na dnes</p>
          <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent ring-1 ring-inset ring-accent/20">
            <Sparkles className="h-3 w-3" strokeWidth={2} /> AI
          </span>
        </div>
        <div className="relative mt-2 flex items-baseline gap-1.5">
          <AnimatedNumber
            value={Math.round(totals.kcal)}
            className="text-4xl font-bold tracking-tight text-white tabular-nums"
          />
          <span className="text-sm text-muted tabular-nums">/ {plan.targetCalories} kcal</span>
        </div>
        <div className="relative mt-4 flex gap-4">
          <MacroBar label="Biel." value={totals.p} target={plan.targetProteinG} color="var(--color-protein)" />
          <MacroBar label="Sach." value={totals.c} target={plan.targetCarbsG} color="var(--color-carbs)" />
          <MacroBar label="Tuky" value={totals.f} target={plan.targetFatG} color="var(--color-fat)" />
        </div>
      </motion.div>

      {/* ── denný tip ── */}
      {plan.dailyTip && (
        <motion.div
          variants={fade}
          className="flex gap-3 rounded-card border border-accent/25 bg-accent/[0.07] p-4"
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent">
            <Lightbulb className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-accent">
              Tip na dnes
            </p>
            <p className="text-sm leading-relaxed text-fg">{plan.dailyTip}</p>
          </div>
        </motion.div>
      )}

      {error && (
        <motion.p
          variants={fade}
          className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error ring-1 ring-inset ring-error/20"
        >
          {error}
        </motion.p>
      )}

      {/* ── karty jedál ── */}
      {plan.items.map((item) => {
        const busy = busyItem === item.id;
        const isLogged = logged.has(item.id);
        return (
          <motion.div key={item.id} variants={fade} className="card overflow-hidden p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="label-caps">{MEAL_LABEL[item.mealType] ?? item.mealType}</p>
                  {item.timeOfDay && (
                    <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-accent ring-1 ring-inset ring-accent/20">
                      <Clock className="h-3 w-3" strokeWidth={2.5} /> {item.timeOfDay}
                    </span>
                  )}
                </div>
                <p className="mt-1 font-semibold leading-snug text-white">{item.name}</p>
              </div>
              {item.portionG != null && (
                <span className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] tabular-nums text-muted">
                  {Math.round(item.portionG)} g
                </span>
              )}
            </div>

            {item.description && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.description}</p>
            )}

            {item.ingredients && item.ingredients.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {item.ingredients.map((g, gi) => (
                  <span key={gi} className="text-muted">
                    <span className="font-semibold tabular-nums text-fg">{Math.round(g.grams)} g</span> {g.name}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-4 border-t border-border/70 pt-3 text-xs">
              <span className="text-base font-bold tabular-nums text-white">
                {Math.round(item.caloriesKcal)}
                <span className="ml-0.5 text-[11px] font-normal text-muted">kcal</span>
              </span>
              <div className="flex items-center gap-3">
                <MacroChip color="var(--color-protein)" value={item.proteinG} letter="B" />
                <MacroChip color="var(--color-carbs)" value={item.carbsG} letter="S" />
                <MacroChip color="var(--color-fat)" value={item.fatG} letter="T" />
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => swap(item.id)}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm font-medium text-fg transition active:scale-95 disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} strokeWidth={2} />
                Vymeniť
              </button>
              <button
                onClick={() => logItem(item.id)}
                disabled={busy || isLogged}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-100 ${
                  isLogged
                    ? "bg-accent/10 text-accent ring-1 ring-inset ring-accent/20"
                    : "bg-accent text-accent-fg"
                }`}
              >
                {isLogged ? (
                  <>
                    <Check className="h-4 w-4" strokeWidth={2.5} /> Pridané
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" strokeWidth={2.5} /> Pridať do dňa
                  </>
                )}
              </button>
            </div>
          </motion.div>
        );
      })}

      {/* ── plán doplnkov na dnes ── */}
      {plan.supplementPlan && plan.supplementPlan.length > 0 && (
        <motion.div variants={fade} className="card space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <h3 className="font-semibold text-white">Doplnky na dnes</h3>
          </div>
          <div className="space-y-2.5">
            {plan.supplementPlan.map((s, si) => (
              <div key={si} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">
                    {s.name}
                    <span className="ml-2 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-normal tabular-nums text-muted">
                      {s.timing}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.button
        variants={fade}
        onClick={generate}
        className="flex w-full items-center justify-center gap-2 rounded-card border border-border bg-surface-2/50 py-3.5 text-sm font-medium text-muted transition active:scale-[0.99]"
      >
        <RefreshCw className="h-4 w-4" strokeWidth={2} />
        Regenerovať celý plán
      </motion.button>
    </motion.div>
  );
}
