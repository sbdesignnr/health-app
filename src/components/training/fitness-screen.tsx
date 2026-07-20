"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "motion/react";
import { Dumbbell, Sparkles, RefreshCw, ChevronDown, Timer, Video, CalendarClock, Lightbulb } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { getCached, setCached } from "@/lib/client-cache";

function ytLink(q: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

// Platnosť plánu: od–do a či je čas obnoviť.
function planReview(startDate: string | null, createdAt: string, reviewAfterDays: number | null) {
  if (!reviewAfterDays) return null;
  const start = startDate ? new Date(`${startDate}T00:00:00`) : new Date(createdAt);
  const end = new Date(start.getTime() + reviewAfterDays * 86400000);
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86400000);
  const p = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${p(d.getDate())}.${p(d.getMonth() + 1)}.`;
  return { daysLeft, overdue: daysLeft <= 0, fromStr: fmt(start), toStr: fmt(end) };
}

function StartSwitch({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="label-caps shrink-0">Začať od</span>
      <div className="flex flex-1 gap-1 rounded-full bg-surface-2 p-1 text-sm">
        {[0, 1].map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`flex-1 rounded-full py-1.5 font-medium transition active:scale-[0.98] ${
              value === o ? "bg-accent text-accent-fg" : "text-muted"
            }`}
          >
            {o === 0 ? "Dnes" : "Zajtra"}
          </button>
        ))}
      </div>
    </div>
  );
}

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  intensity: string | null;
  restSec: number | null;
  notes: string | null;
  sortOrder: number;
  lastWeightKg: number | null;
};
type Day = { id: string; dayIndex: number; title: string; focus: string | null; exercises: Exercise[] };
type Program = {
  id: string;
  phase: string;
  summary: string | null;
  model: string;
  createdAt: string;
  startDate: string | null;
  reviewAfterDays: number | null;
  guidance: string[] | null;
  days: Day[];
};
type LogEntry = { id: string; weightKg: number; reps: number | null; note: string | null; loggedAt: string };

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.025 } },
};
const fade: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)}.${Number(m)}.${y.slice(2)}`;
}

// Kompaktný graf progresu váhy cviku.
function MiniWeightChart({ entries }: { entries: LogEntry[] }) {
  const pts = [...entries].reverse();
  if (pts.length < 2) return null;
  const W = 300;
  const H = 64;
  const pad = 8;
  const ys = pts.map((p) => p.weightKg);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (pts.length - 1)) * (W - 2 * pad);
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - 2 * pad);
  const line = pts.map((p, i) => `${x(i)},${y(p.weightKg)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Graf progresu cviku">
      <polyline
        points={line}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1].weightKg)} r="3" fill="var(--color-accent)" />
    </svg>
  );
}

/* ── sheet na zápis váhy + história (progres) ── */
function ExerciseLogSheet({
  exercise,
  onClose,
  onLogged,
  onRenamed,
}: {
  exercise: Exercise;
  onClose: () => void;
  onLogged: (name: string, weightKg: number) => void;
  onRenamed: (id: string, name: string) => void;
}) {
  const [weight, setWeight] = useState(exercise.lastWeightKg != null ? String(exercise.lastWeightKg) : "");
  const [reps, setReps] = useState("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [subOpen, setSubOpen] = useState(false);
  const [sub, setSub] = useState(exercise.name);
  const [subBusy, setSubBusy] = useState(false);

  async function substitute() {
    const name = sub.trim();
    if (!name || name === exercise.name) {
      setSubOpen(false);
      return;
    }
    setSubBusy(true);
    setError("");
    try {
      const res = await fetch("/api/training/exercise", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: exercise.id, name }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Nahradenie zlyhalo.");
      onRenamed(exercise.id, name);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setSubBusy(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/training/log?exercise=${encodeURIComponent(exercise.name)}`);
        if (res.ok) setHistory((await res.json()).history ?? []);
      } catch {
        /* ignore */
      }
    })();
  }, [exercise.name]);

  async function save() {
    const w = Number(weight);
    if (!(w > 0)) {
      setError("Zadaj váhu.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/training/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseName: exercise.name,
          weightKg: w,
          reps: reps ? Number(reps) : null,
          note: note.trim() || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Zápis zlyhal.");
      setHistory(d.history ?? []);
      setReps("");
      setNote("");
      onLogged(exercise.name, w);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setBusy(false);
    }
  }

  const best = history.reduce((m, h) => Math.max(m, h.weightKg), 0);
  const inp =
    "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3.5 text-fg outline-none transition placeholder:text-muted/70 focus:border-accent";

  return (
    <Sheet open onClose={onClose} title={exercise.name}>
      <div className="space-y-4">
        <p className="text-xs text-muted">
          {exercise.sets} sérií × {exercise.reps}
          {exercise.intensity ? ` · ${exercise.intensity}` : ""}
        </p>

        <div className="flex gap-2">
          <div className="flex flex-[2] items-center rounded-2xl border border-border bg-surface-2 px-4 transition focus-within:border-accent">
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              inputMode="decimal"
              placeholder="Váha"
              autoFocus
              className="min-w-0 flex-1 bg-transparent py-3.5 text-fg outline-none placeholder:text-muted/70"
            />
            <span className="text-sm text-muted">kg</span>
          </div>
          <input
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            inputMode="numeric"
            placeholder="Opak."
            className={`flex-1 ${inp}`}
          />
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Poznámka (voliteľné)"
          className={inp}
        />

        {error && (
          <p className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-inset ring-error/20">
            {error}
          </p>
        )}

        <button
          onClick={save}
          disabled={busy}
          className="w-full rounded-card bg-accent py-3.5 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? "Zapisujem…" : "Zapísať váhu"}
        </button>

        <div>
          <button
            onClick={() => setSubOpen((v) => !v)}
            className="text-xs font-medium text-muted transition active:opacity-70"
          >
            ⇄ Nahradiť iným cvikom (napr. Hack squat)
          </button>
          {subOpen && (
            <div className="mt-2 flex gap-2">
              <input
                value={sub}
                onChange={(e) => setSub(e.target.value)}
                placeholder="Nový názov cviku"
                className={inp}
              />
              <button
                onClick={substitute}
                disabled={subBusy}
                className="shrink-0 rounded-2xl bg-surface-3 px-4 text-sm font-semibold text-white ring-1 ring-inset ring-border transition active:scale-95 disabled:opacity-60"
              >
                {subBusy ? "…" : "Nahradiť"}
              </button>
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="label-caps">Progres</p>
              {best > 0 && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-accent ring-1 ring-inset ring-accent/20">
                  PR {best} kg
                </span>
              )}
            </div>
            <MiniWeightChart entries={history} />
            <div className="divide-y divide-border overflow-hidden rounded-2xl bg-surface-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
                  <span className="text-muted tabular-nums">{fmtDate(h.loggedAt)}</span>
                  <span className="font-semibold tabular-nums text-white">
                    {h.weightKg} kg
                    {h.reps != null && <span className="ml-1 text-xs font-normal text-muted">× {h.reps}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function ExerciseRow({ e, onLog }: { e: Exercise; onLog: (e: Exercise) => void }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">{e.name}</p>
        <p className="mt-0.5 text-xs text-muted">
          <span className="tabular-nums text-fg">
            {e.sets} × {e.reps}
          </span>
          {e.intensity ? ` · ${e.intensity}` : ""}
          {e.restSec ? ` · odpočinok ${e.restSec}s` : ""}
        </p>
        {e.notes && <p className="mt-1 text-xs leading-relaxed text-muted">{e.notes}</p>}
        <a
          href={ytLink(`${e.name} cvik správna technika`)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-accent transition active:opacity-70"
        >
          <Video className="h-3 w-3" strokeWidth={2} /> Ako na to (video)
        </a>
      </div>
      <button
        onClick={() => onLog(e)}
        className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold tabular-nums transition active:scale-95 ${
          e.lastWeightKg != null
            ? "bg-surface-3 text-white ring-1 ring-inset ring-border"
            : "bg-accent/10 text-accent ring-1 ring-inset ring-accent/20"
        }`}
      >
        {e.lastWeightKg != null ? `${e.lastWeightKg} kg` : "+ váha"}
      </button>
    </div>
  );
}

function DayCard({ day, onLog }: { day: Day; onLog: (e: Exercise) => void }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(day.dayIndex === 1);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-4 text-left">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-3 text-sm font-bold tabular-nums text-accent">
          {day.dayIndex}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{day.title}</p>
          {day.focus && <p className="truncate text-xs text-muted">{day.focus}</p>}
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-muted">{day.exercises.length} cvikov</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-border border-t border-border">
              {day.exercises.map((e) => (
                <ExerciseRow key={e.id} e={e} onLog={onLog} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FitnessScreen() {
  const reduce = useReducedMotion();
  const cachedGym = getCached<{ program: Program | null }>("training:GYM");
  const [program, setProgram] = useState<Program | null>(cachedGym?.program ?? null);
  const [loading, setLoading] = useState(!cachedGym);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [logEx, setLogEx] = useState<Exercise | null>(null);
  const [startOffset, setStartOffset] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/training?kind=GYM");
        if (res.ok) {
          const d = await res.json();
          setProgram(d.program);
          setCached("training:GYM", { program: d.program });
        }
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
        body: JSON.stringify({ kind: "GYM", startOffset }),
      });
      const text = await res.text();
      let d: { program?: Program; error?: string } | null = null;
      try {
        d = text ? JSON.parse(text) : null;
      } catch {
        d = null;
      }
      if (!res.ok || !d?.program) {
        throw new Error(d?.error ?? `Generovanie zlyhalo (${res.status}). Skús to o chvíľu znova.`);
      }
      setProgram(d.program);
      setCached("training:GYM", { program: d.program });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setGenerating(false);
    }
  }

  // Po zápise váhy lokálne aktualizuj poslednú váhu cviku.
  function applyLogged(name: string, weightKg: number) {
    setProgram((p) =>
      p
        ? {
            ...p,
            days: p.days.map((d) => ({
              ...d,
              exercises: d.exercises.map((e) => (e.name === name ? { ...e, lastWeightKg: weightKg } : e)),
            })),
          }
        : p,
    );
  }

  function applyRenamed(id: string, newName: string) {
    setProgram((p) =>
      p
        ? {
            ...p,
            days: p.days.map((d) => ({
              ...d,
              exercises: d.exercises.map((e) => (e.id === id ? { ...e, name: newName } : e)),
            })),
          }
        : p,
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-24 rounded-card" />
        <div className="skeleton h-16 rounded-card" />
        <div className="skeleton h-16 rounded-card" />
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
            <p className="text-sm font-semibold text-white">AI skladá tvoj gym plán…</p>
            <p className="text-xs text-muted">Podľa fázy, zápasov a rozvrhu (pár sekúnd)</p>
          </div>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="card space-y-3 p-4">
            <div className="skeleton h-4 w-1/2 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!program) {
    return (
      <div className="space-y-5">
        <div className="card relative overflow-hidden p-7 text-center">
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 ring-1 ring-inset ring-accent/20">
            <Dumbbell className="h-7 w-7 text-accent" strokeWidth={1.5} />
          </div>
          <p className="relative text-lg font-bold text-white">AI gym plán na mieru</p>
          <p className="relative mx-auto mt-2 max-w-[34ch] text-sm leading-relaxed text-muted">
            Zostavím ti tréningy podľa aktuálnej fázy sezóny a zápasov – svaly + prospech futbalu. Vyplň
            si šport v Profile pre najlepší výsledok.
          </p>
        </div>
        {error && (
          <p className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error ring-1 ring-inset ring-error/20">
            {error}
          </p>
        )}
        <StartSwitch value={startOffset} onChange={setStartOffset} />
        <button
          onClick={generate}
          className="flex w-full items-center justify-center gap-2 rounded-card bg-accent py-4 font-semibold text-accent-fg shadow-[0_0_24px_rgba(168,255,62,0.18)] transition active:scale-[0.98]"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2} />
          Vygenerovať gym plán
        </button>
      </div>
    );
  }

  const review = planReview(program.startDate, program.createdAt, program.reviewAfterDays);

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
            <Dumbbell className="h-4 w-4 text-accent" strokeWidth={1.75} />
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
        <div className="relative mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Timer className="h-3.5 w-3.5" strokeWidth={2} />
          {program.days.length} tréningov / týždeň
        </div>
        {review && (
          <div
            className={`relative mt-2 flex items-center gap-1.5 text-xs ${review.overdue ? "font-medium text-warn" : "text-muted"}`}
          >
            <CalendarClock className="h-3.5 w-3.5" strokeWidth={2} />
            {review.overdue
              ? `Platnosť ${review.fromStr} – ${review.toStr} uplynula — čas obnoviť plán.`
              : `Platí ${review.fromStr} – ${review.toStr} (ešte ~${review.daysLeft} dní)`}
          </div>
        )}
      </motion.div>

      {program.guidance && program.guidance.length > 0 && (
        <motion.div variants={fade} className="card space-y-2.5 p-5">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <h2 className="font-semibold text-white">Ako postupovať</h2>
          </div>
          <ul className="space-y-2">
            {program.guidance.map((g, i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span className="leading-relaxed text-fg">{g}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] leading-relaxed text-muted">
            ⚕️ Rady k bolestiam sú všeobecné, nie lekárska diagnóza — pri zhoršení, opuchu či ostrej
            bolesti navštív lekára/fyzioterapeuta.
          </p>
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

      {program.days.map((day) => (
        <motion.div key={day.id} variants={fade}>
          <DayCard day={day} onLog={setLogEx} />
        </motion.div>
      ))}

      <motion.div variants={fade}>
        <StartSwitch value={startOffset} onChange={setStartOffset} />
      </motion.div>
      <motion.button
        variants={fade}
        onClick={generate}
        className="flex w-full items-center justify-center gap-2 rounded-card border border-border bg-surface-2/50 py-3.5 text-sm font-medium text-muted transition active:scale-[0.99]"
      >
        <RefreshCw className="h-4 w-4" strokeWidth={2} />
        Regenerovať plán (podľa fázy a stavu)
      </motion.button>

      {logEx && (
        <ExerciseLogSheet
          exercise={logEx}
          onClose={() => setLogEx(null)}
          onLogged={applyLogged}
          onRenamed={applyRenamed}
        />
      )}
    </motion.div>
  );
}
