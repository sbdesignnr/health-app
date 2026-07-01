"use client";

import { motion, useReducedMotion } from "motion/react";
import { Droplets } from "lucide-react";

type Hydration = { targetMl: number; baseMl: number; heatMl: number; trainingMl: number };

export function HydrationBar({ hydration }: { hydration: Hydration }) {
  const reduce = useReducedMotion();
  const liters = (hydration.targetMl / 1000).toFixed(1);
  const oneDec = (ml: number) => Math.round(ml / 100) / 10;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-fat" strokeWidth={1.75} />
          <span className="label-caps">Pitný režim</span>
        </div>
        <span className="text-sm font-bold tabular-nums text-white">{liters} L</span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-fat/50 via-fat to-accent"
          initial={{ width: reduce ? "100%" : "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: reduce ? 0 : 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted">
        bazál {oneDec(hydration.baseMl)} L
        {hydration.heatMl > 0 && ` · teplo +${oneDec(hydration.heatMl)} L`}
        {hydration.trainingMl > 0 && ` · tréning +${oneDec(hydration.trainingMl)} L`}
      </p>
    </div>
  );
}
