"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";

export type LogEntry = {
  id: string;
  setNumber: number | null;
  weightKg: number;
  reps: number | null;
  note: string | null;
  loggedAt: string;
};

export type ExerciseSession = {
  date: string; // YYYY-MM-DD
  sets: LogEntry[];
  topWeightKg: number;
  topReps: number | null;
  volumeKg: number;
  totalReps: number;
};

export type LoadSuggestion = { weightKg: number; reps: number; rationale: string };

export type LoggableExercise = {
  name: string;
  sets?: number | null;
  reps?: string | null;
  intensity?: string | null;
  lastWeightKg?: number | null;
  suggestion?: LoadSuggestion | null;
};

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)}.${Number(m)}.${y.slice(2)}`;
}

function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const nf = (n: number) => n.toLocaleString("sk-SK");

/** Kompaktný graf progresu: najťažšia séria každého tréningu v čase. */
export function MiniWeightChart({ sessions }: { sessions: ExerciseSession[] }) {
  // staršie → novšie
  const pts = [...sessions].reverse();
  if (pts.length < 2) return null;

  const W = 300;
  const H = 72;
  const pad = 10;
  const ys = pts.map((p) => p.topWeightKg);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (pts.length - 1)) * (W - 2 * pad);
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - 2 * pad);
  const line = pts.map((p, i) => `${x(i)},${y(p.topWeightKg)}`).join(" ");
  const area = `${pad},${H} ${line} ${W - pad},${H}`;
  const last = pts[pts.length - 1];

  return (
    <div className="rounded-2xl bg-surface-2 px-3 pb-2 pt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Graf progresu cviku">
        <defs>
          <linearGradient id="exProgressFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#exProgressFill)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p, i) => (
          <circle
            key={p.date}
            cx={x(i)}
            cy={y(p.topWeightKg)}
            r={i === pts.length - 1 ? 3.5 : 2}
            fill="var(--color-accent)"
          />
        ))}
      </svg>
      <div className="flex items-center justify-between text-[10px] text-muted tabular-nums">
        <span>{fmtDate(pts[0].date)}</span>
        <span>
          najťažšia séria · teraz {last.topWeightKg} kg
        </span>
        <span>{fmtDate(last.date)}</span>
      </div>
    </div>
  );
}

/**
 * Zápis cviku SÉRIU PO SÉRII + prehľad progresu. Zdieľané AI plánom aj vlastnými splitmi.
 * onSubstitute (voliteľné) – premenovanie/nahradenie cviku iným (napr. drep → hack squat).
 */
export function ExerciseLogSheet({
  exercise,
  onClose,
  onLogged,
  onSubstitute,
}: {
  exercise: LoggableExercise;
  onClose: () => void;
  onLogged: (name: string, weightKg: number) => void;
  onSubstitute?: (newName: string) => Promise<void>;
}) {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [sub, setSub] = useState(exercise.name);
  const [subBusy, setSubBusy] = useState(false);

  const today = todayIso();
  const todaySession = useMemo(() => sessions.find((s) => s.date === today), [sessions, today]);
  const todaySets = todaySession?.sets ?? [];
  const nextSetNo = todaySets.length + 1;
  const targetSets = exercise.sets ?? null;

  // Predvyplnenie: pokračuj v poslednej dnešnej sérii, inak návrh AI, inak posledná váha.
  const prefill = useCallback(
    (list: ExerciseSession[]) => {
      const t = list.find((s) => s.date === todayIso());
      const lastToday = t?.sets[t.sets.length - 1];
      if (lastToday) {
        setWeight(String(lastToday.weightKg));
        setReps(lastToday.reps != null ? String(lastToday.reps) : "");
        return;
      }
      if (exercise.suggestion) {
        setWeight(String(exercise.suggestion.weightKg));
        setReps(exercise.suggestion.reps > 0 ? String(exercise.suggestion.reps) : "");
        return;
      }
      const prev = list[0]?.sets[0];
      if (prev) {
        setWeight(String(prev.weightKg));
        setReps(prev.reps != null ? String(prev.reps) : "");
      } else if (exercise.lastWeightKg != null) {
        setWeight(String(exercise.lastWeightKg));
      }
    },
    [exercise.suggestion, exercise.lastWeightKg],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/training/log?exercise=${encodeURIComponent(exercise.name)}`);
        if (res.ok) {
          const list: ExerciseSession[] = (await res.json()).sessions ?? [];
          if (cancelled) return;
          setSessions(list);
          prefill(list);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exercise.name, prefill]);

  async function saveSet() {
    const w = Number(weight.replace(",", "."));
    if (!(w > 0)) {
      setError("Zadaj váhu série.");
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
          setNumber: nextSetNo,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Zápis zlyhal.");
      setSessions(d.sessions ?? []);
      onLogged(exercise.name, w);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1200);
      // váha ostáva (ďalšia séria býva rovnaká alebo o kúsok vyššia)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSet(id: string) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/training/log?id=${encodeURIComponent(id)}&exercise=${encodeURIComponent(exercise.name)}`,
        { method: "DELETE" },
      );
      if (res.ok) setSessions((await res.json()).sessions ?? []);
    } finally {
      setBusy(false);
    }
  }

  async function substitute() {
    const name = sub.trim();
    if (!onSubstitute || !name || name === exercise.name) {
      setSubOpen(false);
      return;
    }
    setSubBusy(true);
    setError("");
    try {
      await onSubstitute(name);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setSubBusy(false);
    }
  }

  // ── Súhrn progresu ──
  const prBest = sessions.reduce((m, s) => Math.max(m, s.topWeightKg), 0);
  const history = sessions.filter((s) => s.date !== today);
  const lastDone = history[0] ?? null;
  const deltaKg =
    todaySession && lastDone ? Math.round((todaySession.topWeightKg - lastDone.topWeightKg) * 10) / 10 : null;
  const deltaVolume =
    todaySession && lastDone ? Math.round(todaySession.volumeKg - lastDone.volumeKg) : null;

  const inp =
    "rounded-2xl border border-border bg-surface-2 px-4 py-3.5 text-base text-fg outline-none transition placeholder:text-muted/70 focus:border-accent";

  return (
    <Sheet open onClose={onClose} title={exercise.name}>
      <div className="space-y-4">
        {(targetSets || exercise.reps) && (
          <p className="text-xs text-muted">
            Cieľ: {targetSets ?? "?"} pracovných sérií × {exercise.reps ?? "?"}
            {exercise.intensity ? ` · ${exercise.intensity}` : ""}
          </p>
        )}

        {exercise.suggestion && todaySets.length === 0 && (
          <div className="rounded-2xl bg-accent/[0.07] px-4 py-3 ring-1 ring-inset ring-accent/20">
            <p className="text-sm font-semibold text-accent">
              👉 Skús {exercise.suggestion.weightKg} kg
              {exercise.suggestion.reps > 0 ? ` × ${exercise.suggestion.reps}` : ""}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{exercise.suggestion.rationale}</p>
          </div>
        )}

        {/* ── DNEŠNÝ TRÉNING – séria po sérii ── */}
        <div className="space-y-2.5 rounded-2xl bg-surface-2 p-3.5">
          <div className="flex items-center justify-between">
            <p className="label-caps">Dnešný tréning</p>
            {todaySets.length > 0 && (
              <span className="text-[11px] font-medium text-muted tabular-nums">
                objem {nf(todaySession?.volumeKg ?? 0)} kg
              </span>
            )}
          </div>

          {todaySets.length > 0 && (
            <div className="divide-y divide-border overflow-hidden rounded-xl bg-bg">
              {todaySets.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-surface-3 text-[11px] font-bold text-muted tabular-nums">
                    {s.setNumber ?? i + 1}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-white tabular-nums">
                    {s.weightKg} kg
                    {s.reps != null && (
                      <span className="ml-1.5 text-xs font-normal text-muted">× {s.reps} opak.</span>
                    )}
                  </span>
                  <button
                    onClick={() => removeSet(s.id)}
                    disabled={busy}
                    aria-label={`Zmazať sériu ${s.setNumber ?? i + 1}`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition active:scale-90 active:bg-surface-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* zadanie novej série */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">
              Séria {nextSetNo}
              {targetSets ? ` z ${targetSets}` : ""}
            </p>
            <div className="flex gap-2">
              <div className="flex flex-[1.3] items-center rounded-2xl border border-border bg-bg px-3.5 transition focus-within:border-accent">
                <input
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  inputMode="decimal"
                  placeholder="Váha"
                  className="min-w-0 flex-1 bg-transparent py-3.5 text-base text-fg outline-none placeholder:text-muted/70"
                />
                <span className="shrink-0 text-sm text-muted">kg</span>
              </div>
              <div className="flex flex-1 items-center rounded-2xl border border-border bg-bg px-3.5 transition focus-within:border-accent">
                <input
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  inputMode="numeric"
                  placeholder="Opak."
                  className="min-w-0 flex-1 bg-transparent py-3.5 text-base text-fg outline-none placeholder:text-muted/70"
                />
                <span className="shrink-0 text-sm text-muted">×</span>
              </div>
            </div>
          </div>

          <button
            onClick={saveSet}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
          >
            {justSaved ? (
              <>
                <Check className="h-4 w-4" strokeWidth={2.6} /> Zapísané
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" strokeWidth={2.6} />{" "}
                {busy ? "Zapisujem…" : `Zapísať sériu ${nextSetNo}`}
              </>
            )}
          </button>

          {targetSets != null && todaySets.length >= targetSets && (
            <p className="text-center text-[11px] font-medium text-accent">
              ✓ Cieľ {targetSets} sérií splnený
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-inset ring-error/20">
            {error}
          </p>
        )}

        {/* ── PROGRES ── */}
        {loaded && sessions.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="label-caps">Progres</p>
              {prBest > 0 && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-accent ring-1 ring-inset ring-accent/20">
                  PR {prBest} kg
                </span>
              )}
            </div>

            {/* porovnanie s minulým tréningom */}
            {deltaKg != null && lastDone && (
              <div className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3.5 py-2.5">
                {deltaKg > 0 ? (
                  <TrendingUp className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
                ) : deltaKg < 0 ? (
                  <TrendingDown className="h-4 w-4 shrink-0 text-warn" strokeWidth={2} />
                ) : (
                  <TrendingUp className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
                )}
                <p className="text-xs leading-relaxed text-muted">
                  Oproti {fmtDate(lastDone.date)}:{" "}
                  <span className={`font-semibold ${deltaKg > 0 ? "text-accent" : "text-white"}`}>
                    {deltaKg > 0 ? "+" : ""}
                    {deltaKg} kg
                  </span>{" "}
                  na najťažšej sérii
                  {deltaVolume != null && (
                    <>
                      {" · objem "}
                      <span className={`font-semibold ${deltaVolume > 0 ? "text-accent" : "text-white"}`}>
                        {deltaVolume > 0 ? "+" : ""}
                        {nf(deltaVolume)} kg
                      </span>
                    </>
                  )}
                </p>
              </div>
            )}

            <MiniWeightChart sessions={sessions} />

            {/* história po tréningoch */}
            <div className="divide-y divide-border overflow-hidden rounded-2xl bg-surface-2">
              {sessions.map((s) => (
                <div key={s.date} className="px-3.5 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-white tabular-nums">
                      {fmtDate(s.date)}
                      {s.date === today && <span className="ml-1.5 text-[11px] text-accent">dnes</span>}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted tabular-nums">
                      {s.sets.length} {s.sets.length === 1 ? "séria" : s.sets.length < 5 ? "série" : "sérií"} ·{" "}
                      {nf(s.volumeKg)} kg
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted tabular-nums">
                    {s.sets
                      .map((x) => `${x.weightKg}${x.reps != null ? `×${x.reps}` : ""}`)
                      .join("  ·  ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loaded && sessions.length === 0 && (
          <p className="text-center text-xs leading-relaxed text-muted">
            Zatiaľ žiadna história. Zapíš prvú sériu — od druhého tréningu ti appka ukáže graf a navrhne
            ďalšiu váhu.
          </p>
        )}

        {onSubstitute && (
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
                  className={`min-w-0 flex-1 ${inp}`}
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
        )}
      </div>
    </Sheet>
  );
}
