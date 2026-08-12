"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { TrendingUp, TrendingDown, Minus, Dumbbell, Flame, CalendarCheck } from "lucide-react";

type Bucket = { label: string; volume: number; sessions: number };
type ExerciseProgress = {
  name: string;
  sessions: number;
  bestKg: number;
  firstKg: number;
  lastKg: number;
  deltaKg: number;
  lastAt: string;
};
type Progress = {
  range: "day" | "week" | "year";
  buckets: Bucket[];
  totalSessions: number;
  totalVolume: number;
  exercises: ExerciseProgress[];
};

const RANGES: { key: Progress["range"]; label: string }[] = [
  { key: "day", label: "Deň" },
  { key: "week", label: "Týždeň" },
  { key: "year", label: "Rok" },
];

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } };
const fade: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

function fmtVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1).replace(".", ",")} t`;
  return `${Math.round(kg)} kg`;
}

// Stĺpcový graf objemu (Σ váha × opakovania) po bucketoch.
function VolumeBars({ buckets }: { buckets: Bucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.volume));
  return (
    <div className="flex items-end gap-1.5" style={{ height: 120 }}>
      {buckets.map((b, i) => {
        const h = b.volume > 0 ? Math.max(4, (b.volume / max) * 100) : 2;
        return (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end">
              <div
                className={`w-full rounded-t-md transition-all ${b.volume > 0 ? "bg-accent" : "bg-surface-3"}`}
                style={{ height: `${h}%` }}
                title={`${b.label}: ${fmtVolume(b.volume)}`}
              />
            </div>
            <span className="w-full truncate text-center text-[9px] text-muted">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0)
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-accent">
        <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.2} /> +{delta} kg
      </span>
    );
  if (delta < 0)
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-warn">
        <TrendingDown className="h-3.5 w-3.5" strokeWidth={2.2} /> {delta} kg
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-xs font-medium text-muted">
      <Minus className="h-3.5 w-3.5" strokeWidth={2.2} /> 0
    </span>
  );
}

export function TrainingProgressScreen() {
  const reduce = useReducedMotion();
  const [range, setRange] = useState<Progress["range"]>("week");
  const [data, setData] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const res = await fetch(`/api/training/progress?range=${range}`);
      if (res.ok && alive) setData((await res.json()).progress);
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [range]);

  const rangeNote =
    range === "day" ? "posledných 14 dní" : range === "week" ? "posledných 12 týždňov" : "posledných 12 mesiacov";

  return (
    <motion.div className="space-y-4 pb-4" variants={container} initial={reduce ? false : "hidden"} animate="show">
      {/* prepínač rozsahu */}
      <motion.div variants={fade} className="flex gap-1 rounded-full bg-surface-2 p-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition active:scale-[0.98] ${
              range === r.key ? "bg-accent text-accent-fg" : "text-muted"
            }`}
          >
            {r.label}
          </button>
        ))}
      </motion.div>

      {loading || !data ? (
        <>
          <div className="skeleton h-40 rounded-card" />
          <div className="skeleton h-20 rounded-card" />
          <div className="skeleton h-20 rounded-card" />
        </>
      ) : (
        <>
          {/* súhrn */}
          <motion.div variants={fade} className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <div className="flex items-center gap-1.5 text-muted">
                <CalendarCheck className="h-4 w-4 text-accent" strokeWidth={1.75} />
                <span className="text-xs">Tréningov</span>
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-white">{data.totalSessions}</p>
              <p className="text-[11px] text-muted">{rangeNote}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-1.5 text-muted">
                <Flame className="h-4 w-4 text-accent" strokeWidth={1.75} />
                <span className="text-xs">Celkový objem</span>
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-white">{fmtVolume(data.totalVolume)}</p>
              <p className="text-[11px] text-muted">Σ váha × opakovania</p>
            </div>
          </motion.div>

          {/* graf objemu */}
          <motion.div variants={fade} className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="label-caps">Objem tréningu</p>
              <span className="text-[11px] text-muted">{rangeNote}</span>
            </div>
            {data.buckets.every((b) => b.volume === 0) ? (
              <p className="py-8 text-center text-sm text-muted">
                Zatiaľ žiadne zapísané váhy v tomto období. Zapíš si prvý cvik a graf ožije.
              </p>
            ) : (
              <VolumeBars buckets={data.buckets} />
            )}
          </motion.div>

          {/* progres jednotlivých cvikov */}
          <motion.div variants={fade} className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
              <Dumbbell className="h-4 w-4 text-accent" strokeWidth={1.75} />
              <h2 className="font-semibold text-white">Cviky a posun</h2>
            </div>
            {data.exercises.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted">
                Zatiaľ žiadne zapísané cviky v tomto období.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.exercises.map((e) => (
                  <li key={e.name} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-fg">{e.name}</p>
                      <p className="mt-0.5 text-xs text-muted tabular-nums">
                        {e.sessions}× · teraz {e.lastKg} kg · PR {e.bestKg} kg
                      </p>
                    </div>
                    <DeltaBadge delta={e.deltaKg} />
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          <motion.p variants={fade} className="px-1 text-center text-[11px] leading-relaxed text-muted">
            Posun (± kg) je rozdiel medzi prvým a posledným zápisom cviku v zvolenom období.
          </motion.p>
        </>
      )}
    </motion.div>
  );
}
