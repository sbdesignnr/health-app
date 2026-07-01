"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Sparkles, ChevronDown } from "lucide-react";

type Stats = {
  daysLogged: number;
  totalDays: number;
  avgKcal: number;
  avgProteinG: number;
  avgCarbsG: number;
  avgFatG: number;
  weightStartKg: number | null;
  weightEndKg: number | null;
  weightChangeKg: number | null;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
};

type Ai = {
  summary: string;
  weightAssessment: string;
  consistency: string;
  macroAssessment: string;
  recommendations: string[];
  score: number;
};

type Insight = {
  id: string;
  type: string;
  periodStart: string;
  periodEnd: string;
  model: string;
  summary: string | null;
  stats: Stats | null;
  ai: Ai | null;
  createdAt: string;
};

function fmtDate(d: string): string {
  const [, m, day] = d.split("-");
  return `${Number(day)}.${Number(m)}.`;
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "var(--color-accent)" : score >= 60 ? "var(--color-carbs)" : "var(--color-protein)";
  const R = 16;
  const C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(1, score / 100));
  return (
    <div className="relative grid h-11 w-11 shrink-0 place-items-center">
      <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
        <circle cx="20" cy="20" r={R} fill="none" stroke="var(--color-surface-3)" strokeWidth="3.5" />
        <motion.circle
          cx="20"
          cy="20"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          whileInView={{ strokeDashoffset: C * (1 - pct) }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <span className="absolute text-[11px] font-bold tabular-nums text-white">{Math.round(score)}</span>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-2 py-2.5">
      <div className="text-sm font-bold tabular-nums text-white">{value}</div>
      {sub && <div className="text-[10px] text-muted">{sub}</div>}
      <div className="label-caps mt-0.5">{label}</div>
    </div>
  );
}

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const reduce = useReducedMotion();
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">
          <span style={{ color }} className="font-semibold">
            {value}
          </span>
          <span className="text-muted"> / {target} g</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: reduce ? `${pct * 100}%` : "0%" }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: reduce ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

function Assessment({ label, text }: { label: string; text: string }) {
  return (
    <p className="text-sm leading-relaxed">
      <span className="font-semibold text-fg">{label}: </span>
      <span className="text-muted">{text}</span>
    </p>
  );
}

function InsightCard({ ins, expanded, onToggle }: { ins: Insight; expanded: boolean; onToggle: () => void }) {
  const { ai, stats: st } = ins;
  const reduce = useReducedMotion();
  return (
    <div className="card overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-5 text-left">
        {ai && <ScoreRing score={ai.score} />}
        <div className="min-w-0 flex-1">
          <p className="label-caps">
            {ins.type === "WEEKLY" ? "Týždenné" : "Mesačné"} · {fmtDate(ins.periodStart)}–{fmtDate(ins.periodEnd)}
          </p>
          <p className="mt-0.5 truncate text-sm text-fg">{ins.summary}</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && st && ai && (
          <motion.div
            key="body"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-border px-5 pb-5 pt-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Zapísané" value={`${st.daysLogged}/${st.totalDays}`} sub="dní" />
                <Stat label="Ø kalórie" value={`${st.avgKcal}`} sub={`cieľ ${st.targetCalories}`} />
                <Stat
                  label="Váha Δ"
                  value={st.weightChangeKg != null ? `${st.weightChangeKg > 0 ? "+" : ""}${st.weightChangeKg}` : "—"}
                  sub="kg"
                />
              </div>

              <div className="space-y-2.5">
                <MacroBar label="Ø Bielkoviny" value={st.avgProteinG} target={st.targetProteinG} color="var(--color-protein)" />
                <MacroBar label="Ø Sacharidy" value={st.avgCarbsG} target={st.targetCarbsG} color="var(--color-carbs)" />
                <MacroBar label="Ø Tuky" value={st.avgFatG} target={st.targetFatG} color="var(--color-fat)" />
              </div>

              <div className="space-y-1.5">
                <Assessment label="Váha" text={ai.weightAssessment} />
                <Assessment label="Konzistentnosť" text={ai.consistency} />
                <Assessment label="Makrá" text={ai.macroAssessment} />
              </div>

              <div>
                <p className="label-caps mb-2">Odporúčania</p>
                <ul className="space-y-2">
                  {ai.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-2.5 text-sm">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span className="leading-relaxed">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function InsightsSection() {
  const reduce = useReducedMotion();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<"" | "WEEKLY" | "MONTHLY">("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/insights");
        if (res.ok) {
          const list: Insight[] = (await res.json()).insights ?? [];
          setInsights(list);
          if (list[0]) setExpandedId(list[0].id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function generate(type: "WEEKLY" | "MONTHLY") {
    setGenerating(type);
    setError("");
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Vyhodnotenie zlyhalo.");
      const insight: Insight = (await res.json()).insight;
      setInsights((prev) => [insight, ...prev]);
      setExpandedId(insight.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setGenerating("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" strokeWidth={1.75} />
        <h2 className="text-lg font-bold tracking-tight text-white">AI vyhodnotenia</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1">
        {(["WEEKLY", "MONTHLY"] as const).map((t) => (
          <button
            key={t}
            onClick={() => generate(t)}
            disabled={!!generating}
            className={`rounded-xl py-2.5 text-sm font-medium transition active:scale-[0.98] disabled:opacity-60 ${
              generating === t ? "bg-accent text-accent-fg" : "text-fg"
            }`}
          >
            {generating === t ? "Generujem…" : t === "WEEKLY" ? "Týždenné" : "Mesačné"}
          </button>
        ))}
      </div>

      {generating && (
        <div className="card flex items-center gap-3 p-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-accent/30 blur-md" />
            <Sparkles className="relative h-5 w-5 animate-pulse text-accent" strokeWidth={1.75} />
          </div>
          <p className="text-sm text-muted">
            AI (opus) analyzuje tvoje obdobie – môže to chvíľu trvať.
          </p>
        </div>
      )}
      {error && (
        <p className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-inset ring-error/20">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="card space-y-3 p-5">
              <div className="skeleton h-2.5 w-28 rounded" />
              <div className="skeleton h-4 w-3/4 rounded" />
            </div>
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-muted">
            Zatiaľ žiadne vyhodnotenia. Vygeneruj prvé, alebo počkaj na automatické (pondelok / 1. v mesiaci).
          </p>
        </div>
      ) : (
        <motion.div
          className="space-y-3"
          initial={reduce ? false : "hidden"}
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {insights.map((ins) => (
            <motion.div
              key={ins.id}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
            >
              <InsightCard
                ins={ins}
                expanded={expandedId === ins.id}
                onToggle={() => setExpandedId(expandedId === ins.id ? null : ins.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
