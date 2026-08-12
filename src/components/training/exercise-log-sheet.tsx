"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/sheet";

export type LogEntry = { id: string; weightKg: number; reps: number | null; note: string | null; loggedAt: string };

export type LoggableExercise = {
  name: string;
  sets?: number | null;
  reps?: string | null;
  intensity?: string | null;
  lastWeightKg?: number | null;
};

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)}.${Number(m)}.${y.slice(2)}`;
}

// Kompaktný graf progresu váhy cviku.
export function MiniWeightChart({ entries }: { entries: LogEntry[] }) {
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

/**
 * Zápis váhy + história (progres) pre cvik. Zdieľané AI plánom aj vlastnými splitmi.
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
  const [weight, setWeight] = useState(exercise.lastWeightKg != null ? String(exercise.lastWeightKg) : "");
  const [reps, setReps] = useState("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [subOpen, setSubOpen] = useState(false);
  const [sub, setSub] = useState(exercise.name);
  const [subBusy, setSubBusy] = useState(false);

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

  const best = history.reduce((m, h) => Math.max(m, h.weightKg), 0);
  const inp =
    "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3.5 text-fg outline-none transition placeholder:text-muted/70 focus:border-accent";

  return (
    <Sheet open onClose={onClose} title={exercise.name}>
      <div className="space-y-4">
        {(exercise.sets || exercise.reps) && (
          <p className="text-xs text-muted">
            {exercise.sets ?? "?"} sérií × {exercise.reps ?? "?"}
            {exercise.intensity ? ` · ${exercise.intensity}` : ""}
          </p>
        )}

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
        )}

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
