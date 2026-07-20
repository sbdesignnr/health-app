"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { ChevronLeft, ChevronRight, Plus, TriangleAlert, Trash2, Sparkles, Activity } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { getCached, setCached } from "@/lib/client-cache";

type WeekActivity = {
  eventId: string;
  type: string;
  title: string | null;
  startTime: string | null;
  minutes: number;
  rpe: number;
  load: number;
  isRecurring: boolean;
};
type WeekDay = {
  date: string;
  dayName: string;
  activities: WeekActivity[];
  dayLoad: number;
  color: "red" | "orange" | "green" | "grey";
};
type Week = { weekStart: string; days: WeekDay[]; totalLoad: number; warnings: string[] };

const TYPE_OPTS: { key: string; label: string }[] = [
  { key: "FOOTBALL_TRAINING", label: "Futbal tréning" },
  { key: "MATCH", label: "Zápas" },
  { key: "GYM", label: "Posilňovňa" },
  { key: "ACTIVE_RECOVERY", label: "Aktívna regenerácia" },
  { key: "TENNIS", label: "Tenis" },
  { key: "SWIMMING", label: "Plávanie" },
  { key: "RUNNING", label: "Beh" },
  { key: "REST", label: "Voľno" },
  { key: "CUSTOM", label: "Vlastné" },
];
const LABEL: Record<string, string> = Object.fromEntries(TYPE_OPTS.map((t) => [t.key, t.label]));

const BAR: Record<WeekDay["color"], string> = {
  red: "bg-error",
  orange: "bg-warn",
  green: "bg-accent",
  grey: "bg-surface-3",
};

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.025 } } };
const fade: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function ddmm(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(d)}.${Number(m)}.`;
}

export function WeeklyPlanScreen() {
  const reduce = useReducedMotion();
  const cached = getCached<Week>("week");
  const [week, setWeek] = useState<Week | null>(cached ?? null);
  const [anchor, setAnchor] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(!cached);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState<{ date: string; activity: WeekActivity | null } | null>(null);
  const [recalcDate, setRecalcDate] = useState<string | null>(null);

  const load = useCallback(async (date: string) => {
    const res = await fetch(`/api/week?date=${date}`);
    if (res.ok) {
      const d = await res.json();
      setWeek(d.week);
      setCached("week", d.week);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(anchor);
  }, [anchor, load]);

  async function save(payload: Record<string, unknown>, method: "POST" | "PATCH") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/week", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Uloženie zlyhalo.");
      setWeek(d.week);
      setCached("week", d.week);
      setRecalcDate(String(payload.date ?? ""));
      setEdit(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(eventId: string, date: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/week?eventId=${encodeURIComponent(eventId)}&date=${date}`, {
        method: "DELETE",
      });
      const d = await res.json();
      if (res.ok) {
        setWeek(d.week);
        setCached("week", d.week);
        setRecalcDate(date);
      }
      setEdit(null);
    } finally {
      setBusy(false);
    }
  }

  async function recalcMealPlan(date: string) {
    setBusy(true);
    try {
      await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      setRecalcDate(null);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !week) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-24 rounded-card" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-20 rounded-card" />
        ))}
      </div>
    );
  }

  const weekEnd = shiftDate(week.weekStart, 6);

  return (
    <motion.div className="space-y-4 pb-4" variants={container} initial={reduce ? false : "hidden"} animate="show">
      {/* navigácia týždňa + záťaž */}
      <motion.div variants={fade} className="card p-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setAnchor(shiftDate(anchor, -7))}
            className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-muted transition active:scale-90"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="label-caps">Týždeň</p>
            <p className="text-sm font-semibold text-white">
              {ddmm(week.weekStart)} – {ddmm(weekEnd)}
            </p>
          </div>
          <button
            onClick={() => setAnchor(shiftDate(anchor, 7))}
            className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-muted transition active:scale-90"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <Activity className="h-4 w-4 text-accent" strokeWidth={2} />
          <span className="label-caps">Záťaž týždňa</span>
          <span className="ml-auto text-2xl font-bold tabular-nums text-white">{week.totalLoad}</span>
        </div>
        <p className="mt-1 text-[11px] text-muted">Σ RPE × minúty · optimum ~1200–3500</p>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-error" /> zápas / ťažký</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warn" /> stredný</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" /> ľahký</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-surface-3" /> voľno</span>
        </div>
      </motion.div>

      {/* varovania */}
      {week.warnings.length > 0 && (
        <motion.div variants={fade} className="rounded-card border border-warn/30 bg-warn/[0.07] p-4">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-warn" strokeWidth={2} />
            <p className="text-sm font-semibold text-warn">Upozornenia</p>
          </div>
          <ul className="mt-2 space-y-1.5">
            {week.warnings.map((w, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-fg">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warn" />
                {w}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {error && (
        <motion.p variants={fade} className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-inset ring-error/20">
          {error}
        </motion.p>
      )}

      {recalcDate && (
        <motion.button
          variants={fade}
          onClick={() => recalcMealPlan(recalcDate)}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-card bg-accent py-3 text-sm font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2} />
          {busy ? "Prepočítavam…" : `Prepočítať jedálniček (${ddmm(recalcDate)})`}
        </motion.button>
      )}

      {/* dni */}
      {week.days.map((d) => (
        <motion.div key={d.date} variants={fade} className="card overflow-hidden">
          <div className="flex items-stretch">
            <div className={`w-1.5 shrink-0 ${BAR[d.color]}`} />
            <div className="min-w-0 flex-1 p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold text-white">
                  {d.dayName} <span className="font-normal text-muted">{ddmm(d.date)}</span>
                </p>
                <span className="text-[11px] tabular-nums text-muted">{d.dayLoad > 0 ? `load ${d.dayLoad}` : "voľno"}</span>
              </div>

              <div className="mt-2 space-y-1.5">
                {d.activities.length === 0 && <p className="text-xs text-muted">Žiadna aktivita</p>}
                {d.activities.map((a) => (
                  <button
                    key={a.eventId}
                    onClick={() => setEdit({ date: d.date, activity: a })}
                    className="flex w-full items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-left transition active:scale-[0.99]"
                  >
                    <span className="min-w-0 truncate text-sm text-fg">
                      {a.title || LABEL[a.type] || a.type}
                      {a.startTime && <span className="ml-1.5 text-xs text-muted">{a.startTime}</span>}
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted">
                      {a.minutes} min · RPE {a.rpe}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setEdit({ date: d.date, activity: null })}
                className="mt-2 flex items-center gap-1 text-[11px] font-medium text-muted transition active:opacity-70"
              >
                <Plus className="h-3 w-3" /> Pridať aktivitu
              </button>
            </div>
          </div>
        </motion.div>
      ))}

      {edit && (
        <ActivitySheet
          date={edit.date}
          activity={edit.activity}
          busy={busy}
          onClose={() => setEdit(null)}
          onSave={save}
          onDelete={remove}
        />
      )}
    </motion.div>
  );
}

function ActivitySheet({
  date,
  activity,
  busy,
  onClose,
  onSave,
  onDelete,
}: {
  date: string;
  activity: WeekActivity | null;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>, method: "POST" | "PATCH") => void;
  onDelete: (eventId: string, date: string) => void;
}) {
  const [type, setType] = useState(activity?.type ?? "GYM");
  const [minutes, setMinutes] = useState(String(activity?.minutes ?? 60));
  const [rpe, setRpe] = useState(activity?.rpe ?? 6);
  const [title, setTitle] = useState(activity?.title ?? "");

  const inp =
    "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none transition placeholder:text-muted/70 focus:border-accent";

  return (
    <Sheet open onClose={onClose} title={activity ? "Upraviť aktivitu" : "Pridať aktivitu"}>
      <div className="space-y-4">
        <div>
          <p className="label-caps mb-2">Typ aktivity</p>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_OPTS.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-95 ${
                  type === t.key ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted ring-1 ring-inset ring-border"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="label-caps">Trvanie (min)</span>
            <input value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="numeric" className={inp} />
          </label>
          <label className="block space-y-1.5">
            <span className="label-caps">Názov (voliteľné)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="napr. Tenis s bráchom" className={inp} />
          </label>
        </div>

        <div>
          <p className="label-caps mb-2">Náročnosť (RPE {rpe}/10)</p>
          <div className="flex gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setRpe(n)}
                className={`h-9 flex-1 rounded-lg text-xs font-semibold tabular-nums transition active:scale-95 ${
                  rpe === n ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted">2–3 regenerácia · 5–7 tréning · 8–10 zápas / ťažký gym</p>
        </div>

        <button
          onClick={() =>
            onSave(
              {
                date,
                eventId: activity?.eventId,
                type,
                title: title.trim() || null,
                durationMin: Number(minutes) || null,
                rpe,
              },
              activity ? "PATCH" : "POST",
            )
          }
          disabled={busy}
          className="w-full rounded-card bg-accent py-3.5 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? "Ukladám…" : "Uložiť"}
        </button>

        {activity && (
          <button
            onClick={() => onDelete(activity.eventId, date)}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-card border border-error/40 bg-error/10 py-3 text-sm font-semibold text-error transition active:scale-[0.99] disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
            Odstrániť {activity.isRecurring ? "(opakovanú)" : ""}
          </button>
        )}
      </div>
    </Sheet>
  );
}
