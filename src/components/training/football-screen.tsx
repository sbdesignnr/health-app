"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Goal, Sparkles, RefreshCw, Users, Zap, HeartPulse } from "lucide-react";

type Drill = { name: string; detail: string };
type Session = { day: string; title: string; focus: string; drills: Drill[] };
type FootballPlan = {
  teamTrainingFocus: string[];
  individualSessions: Session[];
  recoveryTips: string[];
};
type Program = { id: string; phase: string; summary: string | null; model: string; plan: FootballPlan | null };

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const fade: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5 text-sm">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span className="leading-relaxed text-fg">{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function FootballScreen() {
  const reduce = useReducedMotion();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/training?kind=FOOTBALL");
        if (res.ok) setProgram((await res.json()).program);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "FOOTBALL" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Generovanie zlyhalo.");
      setProgram(d.program);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-24 rounded-card" />
        <div className="skeleton h-32 rounded-card" />
      </div>
    );
  }

  if (generating) {
    return (
      <div className="space-y-4">
        <div className="card flex items-center gap-3 p-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-accent/30 blur-md" />
            <Sparkles className="relative h-5 w-5 animate-pulse text-accent" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">AI skladá tvoj futbalový plán…</p>
            <p className="text-xs text-muted">Podľa postu, fázy a zápasov (pár sekúnd)</p>
          </div>
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="card space-y-3 p-4">
            <div className="skeleton h-4 w-1/2 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!program || !program.plan) {
    return (
      <div className="space-y-5">
        <div className="card relative overflow-hidden p-7 text-center">
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 ring-1 ring-inset ring-accent/20">
            <Goal className="h-7 w-7 text-accent" strokeWidth={1.5} />
          </div>
          <p className="relative text-lg font-bold text-white">AI futbalový plán na mieru</p>
          <p className="relative mx-auto mt-2 max-w-[34ch] text-sm leading-relaxed text-muted">
            Na čo sa zamerať na spoločných tréningoch + čo trénovať individuálne, podľa tvojho postu a
            fázy. Vyplň si šport v Profile a pridaj zápasy do Rozvrhu.
          </p>
        </div>
        {error && (
          <p className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error ring-1 ring-inset ring-error/20">
            {error}
          </p>
        )}
        <button
          onClick={generate}
          className="flex w-full items-center justify-center gap-2 rounded-card bg-accent py-4 font-semibold text-accent-fg shadow-[0_0_24px_rgba(168,255,62,0.18)] transition active:scale-[0.98]"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2} />
          Vygenerovať futbalový plán
        </button>
      </div>
    );
  }

  const plan = program.plan;

  return (
    <motion.div
      className="space-y-4 pb-4"
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
    >
      <motion.div variants={fade} className="card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Goal className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <span className="label-caps">Aktuálna fáza</span>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent ring-1 ring-inset ring-accent/20">
            <Sparkles className="h-3 w-3" strokeWidth={2} /> AI
          </span>
        </div>
        <p className="relative mt-1.5 text-lg font-bold leading-tight text-white">{program.phase}</p>
        {program.summary && (
          <p className="relative mt-1.5 text-sm leading-relaxed text-muted">{program.summary}</p>
        )}
      </motion.div>

      {error && (
        <motion.p
          variants={fade}
          className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error ring-1 ring-inset ring-error/20"
        >
          {error}
        </motion.p>
      )}

      {plan.teamTrainingFocus.length > 0 && (
        <motion.div variants={fade} className="card space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <h2 className="font-semibold text-white">Na spoločných tréningoch</h2>
          </div>
          <Bullets items={plan.teamTrainingFocus} />
        </motion.div>
      )}

      {plan.individualSessions.length > 0 && (
        <motion.div variants={fade} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Zap className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <h2 className="font-semibold text-white">Individuálne tréningy</h2>
          </div>
          {plan.individualSessions.map((s, si) => (
            <div key={si} className="card space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{s.title}</p>
                  {s.focus && <p className="mt-0.5 text-xs text-muted">{s.focus}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-medium text-accent">
                  {s.day}
                </span>
              </div>
              <div className="space-y-2 border-t border-border pt-3">
                {s.drills.map((d, di) => (
                  <div key={di} className="flex gap-2.5 text-sm">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <p className="leading-relaxed">
                      <span className="font-semibold text-fg">{d.name}</span>
                      <span className="text-muted"> — {d.detail}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {plan.recoveryTips.length > 0 && (
        <motion.div variants={fade} className="card space-y-3 p-5">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <h2 className="font-semibold text-white">Regenerácia a prevencia</h2>
          </div>
          <Bullets items={plan.recoveryTips} />
        </motion.div>
      )}

      <motion.button
        variants={fade}
        onClick={generate}
        className="flex w-full items-center justify-center gap-2 rounded-card border border-border bg-surface-2/50 py-3.5 text-sm font-medium text-muted transition active:scale-[0.99]"
      >
        <RefreshCw className="h-4 w-4" strokeWidth={2} />
        Regenerovať plán podľa fázy
      </motion.button>
    </motion.div>
  );
}
