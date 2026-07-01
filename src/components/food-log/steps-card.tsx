"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Footprints } from "lucide-react";

export function StepsCard() {
  const reduce = useReducedMotion();
  const [steps, setSteps] = useState(0);
  const [goal, setGoal] = useState(9000);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/steps");
    if (res.ok) {
      const d = await res.json();
      setSteps(d.steps ?? 0);
      setGoal(d.goal ?? 9000);
    }
    setLoaded(true);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    const n = Number(input);
    if (!Number.isFinite(n) || n < 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: n }),
      });
      if (res.ok) {
        const d = await res.json();
        setSteps(d.steps);
        setGoal(d.goal);
      }
      setEditing(false);
      setInput("");
    } finally {
      setBusy(false);
    }
  }

  const pct = goal > 0 ? Math.min(1, steps / goal) : 0;
  const remaining = Math.max(0, goal - steps);
  const kcalEquiv = Math.round(remaining * 0.04); // ~0.04 kcal/krok
  const done = steps >= goal && steps > 0;
  const hint = !loaded
    ? ""
    : steps === 0
      ? "Zatiaľ 0 krokov — appka Zdravie / Skratka ich pošle, alebo zadaj ručne."
      : done
        ? "Cieľ krokov splnený — super!"
        : `Dober ~${remaining.toLocaleString("sk-SK")} krokov, alebo uber ~${kcalEquiv} kcal.`;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Footprints className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <span className="label-caps">Kroky</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold tabular-nums text-white">
            {steps.toLocaleString("sk-SK")}
            <span className="text-xs font-normal text-muted"> / {goal.toLocaleString("sk-SK")}</span>
          </span>
          <button
            onClick={() => {
              setEditing((v) => !v);
              setInput(steps ? String(steps) : "");
            }}
            className="text-[11px] font-medium text-muted transition active:opacity-70"
          >
            upraviť
          </button>
        </div>
      </div>

      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className={`h-full rounded-full ${done ? "bg-accent" : "bg-gradient-to-r from-fat/60 via-accent/80 to-accent"}`}
          initial={{ width: reduce ? `${pct * 100}%` : "0%" }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: reduce ? 0 : 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </div>

      {hint && <p className="mt-2 text-[11px] text-muted">{hint}</p>}

      {editing && (
        <div className="mt-2.5 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            inputMode="numeric"
            placeholder="Počet krokov"
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg outline-none transition placeholder:text-muted/70 focus:border-accent"
          />
          <button
            onClick={save}
            disabled={busy}
            className="rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg transition active:scale-95 disabled:opacity-60"
          >
            {busy ? "…" : "Uložiť"}
          </button>
        </div>
      )}
    </div>
  );
}
