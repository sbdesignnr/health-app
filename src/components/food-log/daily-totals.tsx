"use client";

import { motion, useReducedMotion } from "motion/react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import type { Targets, Totals } from "./types";

function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const reduce = useReducedMotion();
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;
  const over = consumed > target;
  const R = 80;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - pct);
  const remaining = Math.abs(Math.round(target - consumed));

  return (
    <div className="relative grid place-items-center">
      {/* glow bloom za kruhom */}
      <div
        className={`pointer-events-none absolute h-36 w-36 rounded-full blur-[56px] ${over ? "bg-error/25" : "bg-accent/25"}`}
      />

      <svg viewBox="0 0 184 184" className="relative h-52 w-52 -rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8fe61f" />
            <stop offset="100%" stopColor="#e4ff9e" />
          </linearGradient>
        </defs>
        <circle cx="92" cy="92" r={R} fill="none" stroke="var(--color-surface-3)" strokeWidth="11" />
        <motion.circle
          cx="92"
          cy="92"
          r={R}
          fill="none"
          stroke={over ? "var(--color-error)" : "url(#ring-grad)"}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: reduce ? offset : C }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 1.15, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>

      <div className="absolute flex flex-col items-center">
        <AnimatedNumber
          value={remaining}
          className={`text-6xl font-bold tracking-tighter text-white tabular-nums ${
            over ? "" : "[text-shadow:0_0_30px_rgba(168,255,62,0.22)]"
          }`}
        />
        <span
          className={`mt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${over ? "text-error" : "text-muted"}`}
        >
          {over ? "prekročené" : "zostáva"}
        </span>
        <span className="mt-0.5 text-xs text-muted tabular-nums">z {Math.round(target)} kcal</span>
      </div>
    </div>
  );
}

function MacroPill({
  label,
  value,
  target,
  color,
  delay,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  delay: number;
}) {
  const reduce = useReducedMotion();
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <div className="card flex-1 p-3">
      <div className="flex items-baseline justify-between">
        <span className="label-caps">{label}</span>
        <span className="text-[11px] tabular-nums text-muted">{Math.round(target)}</span>
      </div>
      <div className="mt-1.5 text-xl font-bold tabular-nums text-white">
        {Math.round(value)}
        <span className="text-xs font-normal text-muted"> g</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: reduce ? `${pct * 100}%` : "0%" }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: reduce ? 0 : 0.9, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : delay }}
        />
      </div>
    </div>
  );
}

export function DailyTotals({ totals, targets }: { totals: Totals; targets: Targets }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center pt-2">
        <CalorieRing consumed={totals.caloriesKcal} target={targets.caloriesKcal} />
        {targets.isDefault && (
          <span className="mt-3 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-muted">
            predvolený cieľ
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <MacroPill label="Biel." value={totals.proteinG} target={targets.proteinG} color="var(--color-protein)" delay={0.3} />
        <MacroPill label="Sach." value={totals.carbsG} target={targets.carbsG} color="var(--color-carbs)" delay={0.38} />
        <MacroPill label="Tuky" value={totals.fatG} target={targets.fatG} color="var(--color-fat)" delay={0.46} />
      </div>
    </div>
  );
}
