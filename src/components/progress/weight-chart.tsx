"use client";

import { motion, useReducedMotion } from "motion/react";

type Point = { measuredAt: string; weightKg: number };

export function WeightChart({ series }: { series: Point[] }) {
  const reduce = useReducedMotion();
  if (series.length < 2) return null;

  const W = 320;
  const H = 150;
  const pad = 26;

  const xs = series.map((p) => new Date(p.measuredAt).getTime());
  const ys = series.map((p) => p.weightKg);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const yLo = minY - spanY * 0.15;
  const yHi = maxY + spanY * 0.15;

  const sx = (x: number) => pad + ((x - minX) / spanX) * (W - 2 * pad);
  const sy = (y: number) => pad + (1 - (y - yLo) / (yHi - yLo)) * (H - 2 * pad);

  const line = series.map((p) => `${sx(new Date(p.measuredAt).getTime())},${sy(p.weightKg)}`).join(" ");
  const area = `${sx(minX)},${H - pad} ${line} ${sx(maxX)},${H - pad}`;

  const last = series[series.length - 1];
  const lastX = sx(new Date(last.measuredAt).getTime());
  const lastY = sy(last.weightKg);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Graf váhy v čase">
      <defs>
        <linearGradient id="wc-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.24" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="wc-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8fe61f" />
          <stop offset="100%" stopColor="#c8ff7a" />
        </linearGradient>
      </defs>

      <motion.polygon
        points={area}
        fill="url(#wc-area)"
        initial={{ opacity: reduce ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: reduce ? 0 : 0.35 }}
      />

      <motion.polyline
        points={line}
        fill="none"
        stroke="url(#wc-line)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: reduce ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduce ? 0 : 1.1, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* posledný bod so žiarou */}
      <circle cx={lastX} cy={lastY} r="6" fill="var(--color-accent)" opacity="0.22" />
      <motion.circle
        cx={lastX}
        cy={lastY}
        r="3.5"
        fill="var(--color-accent)"
        stroke="var(--color-bg)"
        strokeWidth="1.5"
        initial={{ scale: reduce ? 1 : 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: reduce ? 0 : 1, type: "spring", stiffness: 400, damping: 18 }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />

      <text x={pad} y={13} fontSize="9" className="fill-muted">
        {maxY.toFixed(1)} kg
      </text>
      <text x={pad} y={H - 7} fontSize="9" className="fill-muted">
        {minY.toFixed(1)} kg
      </text>
    </svg>
  );
}
