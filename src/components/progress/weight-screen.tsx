"use client";

import { useEffect, useState, type FormEvent } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { WeightChart } from "./weight-chart";

type Point = { id: string; weightKg: number; measuredAt: string };
type Stats = { current: number | null; change7d: number | null; change30d: number | null; count: number };

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};
const fade: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

const oneDec = (n: number) =>
  n.toLocaleString("sk-SK", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Delta({ v, label }: { v: number; label: string }) {
  const color = v === 0 ? "text-muted" : v < 0 ? "text-accent" : "text-protein";
  const Icon = v === 0 ? Minus : v < 0 ? TrendingDown : TrendingUp;
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-2.5 pr-3">
      <span className="label-caps">{label}</span>
      <span className={`flex items-center gap-0.5 text-xs font-semibold tabular-nums ${color}`}>
        <Icon className="h-3 w-3" strokeWidth={2.5} />
        {v > 0 ? "+" : ""}
        {v} kg
      </span>
    </div>
  );
}

export function WeightScreen() {
  const reduce = useReducedMotion();
  const [series, setSeries] = useState<Point[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/weight");
    if (res.ok) {
      const d = await res.json();
      setSeries(d.series ?? []);
      setStats(d.stats ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    const w = Number(weight);
    if (!(w > 0)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg: w }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Zápis zlyhal.");
      const d = await res.json();
      setSeries(d.series ?? []);
      setStats(d.stats ?? null);
      setWeight("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="card h-56 p-5">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton mt-3 h-9 w-32 rounded" />
          <div className="skeleton mt-6 h-24 w-full rounded-xl" />
        </div>
        <div className="skeleton h-14 rounded-card" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-5"
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
    >
      <motion.div variants={fade} className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="label-caps">Aktuálna váha</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              {stats?.current != null ? (
                <AnimatedNumber
                  value={stats.current}
                  format={oneDec}
                  className="text-4xl font-bold tracking-tight text-white tabular-nums"
                />
              ) : (
                <span className="text-4xl font-bold text-muted">—</span>
              )}
              <span className="text-lg text-muted">kg</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {stats?.change7d != null && <Delta v={stats.change7d} label="7 dní" />}
            {stats?.change30d != null && <Delta v={stats.change30d} label="30 dní" />}
          </div>
        </div>

        {series.length >= 2 ? (
          <div className="mt-4">
            <WeightChart series={series} />
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-muted">
            Pridaj aspoň 2 záznamy, aby sa zobrazil graf.
          </p>
        )}
      </motion.div>

      <motion.form variants={fade} onSubmit={add} className="space-y-2">
        <div className="flex gap-2">
          <div className="flex flex-1 items-center rounded-2xl border border-border bg-surface px-4 transition focus-within:border-accent">
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              inputMode="decimal"
              placeholder="Zapísať váhu (napr. 78.5)"
              className="min-w-0 flex-1 bg-transparent py-3.5 text-fg outline-none placeholder:text-muted/70"
            />
            <span className="text-sm text-muted">kg</span>
          </div>
          <button
            disabled={busy}
            className="rounded-2xl bg-accent px-5 font-semibold text-accent-fg transition active:scale-95 disabled:opacity-60"
          >
            {busy ? "…" : "Zapísať"}
          </button>
        </div>
        {error && (
          <p className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-inset ring-error/20">
            {error}
          </p>
        )}
      </motion.form>
    </motion.div>
  );
}
