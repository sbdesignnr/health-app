"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "motion/react";
import { Plus, ChevronDown, Pencil, Trash2, Dumbbell, X, GripVertical } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { ExerciseLogSheet, type LoggableExercise } from "./exercise-log-sheet";

type SplitExercise = {
  id: string;
  name: string;
  targetSets: number | null;
  targetReps: string | null;
  note: string | null;
  sortOrder: number;
  lastWeightKg: number | null;
};
type Split = { id: string; name: string; note: string | null; sortOrder: number; exercises: SplitExercise[] };

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } };
const fade: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

const inp =
  "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none transition placeholder:text-muted/70 focus:border-accent";

type LogTarget = LoggableExercise & { exerciseId: string };

export function SplitsScreen() {
  const reduce = useReducedMotion();
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Split | null>(null);
  const [logTarget, setLogTarget] = useState<LogTarget | null>(null);

  async function load() {
    const res = await fetch("/api/splits");
    if (res.ok) {
      const s: Split[] = (await res.json()).splits ?? [];
      setSplits(s);
      setOpenId((cur) => (cur === null && s.length > 0 ? s[0].id : cur));
      // ak je otvorený editor, synchronizuj ho s čerstvými dátami
      setEditing((cur) => (cur ? (s.find((x) => x.id === cur.id) ?? null) : cur));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function applyLogged(name: string, weightKg: number) {
    setSplits((prev) =>
      prev.map((s) => ({
        ...s,
        exercises: s.exercises.map((e) => (e.name === name ? { ...e, lastWeightKg: weightKg } : e)),
      })),
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton h-24 rounded-card" />
        ))}
      </div>
    );
  }

  return (
    <motion.div className="space-y-4 pb-4" variants={container} initial={reduce ? false : "hidden"} animate="show">
      {splits.length === 0 && (
        <motion.div variants={fade} className="card space-y-3 p-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 ring-1 ring-inset ring-accent/20">
            <Dumbbell className="h-7 w-7 text-accent" strokeWidth={1.5} />
          </div>
          <p className="font-semibold text-white">Zatiaľ žiadne tréningy</p>
          <p className="mx-auto max-w-[34ch] text-sm leading-relaxed text-muted">
            Vytvor si vlastné splity (Upper 1, Lower 1, Push, Pull…) a k nim cviky. Potom si pri každom
            zapisuješ váhy a opakovania.
          </p>
        </motion.div>
      )}

      {splits.map((s) => (
        <motion.div key={s.id} variants={fade} className="card overflow-hidden">
          <div className="flex items-center gap-2 p-4">
            <button onClick={() => setOpenId(openId === s.id ? null : s.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-3 text-accent">
                <Dumbbell className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{s.name}</p>
                <p className="truncate text-xs text-muted">{s.exercises.length} cvikov</p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted transition-transform duration-300 ${openId === s.id ? "rotate-180" : ""}`}
              />
            </button>
            <button
              onClick={() => setEditing(s)}
              aria-label="Upraviť tréning"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition active:scale-90 active:bg-surface-2"
            >
              <Pencil className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {openId === s.id && (
              <motion.div
                initial={reduce ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="divide-y divide-border border-t border-border">
                  {s.exercises.length === 0 && (
                    <p className="px-4 py-4 text-center text-sm text-muted">
                      Žiadne cviky. Ťukni na ceruzku a pridaj ich.
                    </p>
                  )}
                  {s.exercises.map((e) => (
                    <button
                      key={e.id}
                      onClick={() =>
                        setLogTarget({
                          exerciseId: e.id,
                          name: e.name,
                          sets: e.targetSets,
                          reps: e.targetReps,
                          lastWeightKg: e.lastWeightKg,
                        })
                      }
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition active:bg-surface-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-fg">{e.name}</p>
                        {(e.targetSets || e.targetReps) && (
                          <p className="mt-0.5 text-xs text-muted tabular-nums">
                            {e.targetSets ?? "?"} × {e.targetReps ?? "?"}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold tabular-nums transition ${
                          e.lastWeightKg != null
                            ? "bg-surface-3 text-white ring-1 ring-inset ring-border"
                            : "bg-accent/10 text-accent ring-1 ring-inset ring-accent/20"
                        }`}
                      >
                        {e.lastWeightKg != null ? `${e.lastWeightKg} kg` : "+ váha"}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}

      <motion.button
        variants={fade}
        onClick={() => setCreating(true)}
        className="flex w-full items-center justify-center gap-2 rounded-card border border-border bg-surface-2/60 py-3.5 text-sm font-medium transition active:scale-[0.99]"
      >
        <Plus className="h-4 w-4" strokeWidth={2.4} /> Nový tréning (split)
      </motion.button>

      {creating && (
        <CreateSplitSheet
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await load();
          }}
        />
      )}

      {editing && (
        <EditSplitSheet
          split={editing}
          onClose={() => setEditing(null)}
          onChanged={load}
          onDeleted={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}

      {logTarget && (
        <ExerciseLogSheet
          exercise={logTarget}
          onClose={() => setLogTarget(null)}
          onLogged={applyLogged}
          onSubstitute={async (newName) => {
            const res = await fetch(`/api/splits/exercise/${logTarget.exerciseId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: newName }),
            });
            if (!res.ok) throw new Error((await res.json()).error ?? "Nahradenie zlyhalo.");
            await load();
          }}
        />
      )}
    </motion.div>
  );
}

type DraftExercise = { name: string; sets: string; reps: string };

function ExerciseDraftRows({
  rows,
  setRows,
}: {
  rows: DraftExercise[];
  setRows: (r: DraftExercise[]) => void;
}) {
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 shrink-0 text-muted/50" />
          <input
            value={r.name}
            onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            placeholder="Názov cviku"
            className={`${inp} flex-1`}
          />
          <input
            value={r.sets}
            onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, sets: e.target.value } : x)))}
            inputMode="numeric"
            placeholder="série"
            className={`${inp} w-16 px-2 text-center`}
          />
          <input
            value={r.reps}
            onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, reps: e.target.value } : x)))}
            placeholder="opak."
            className={`${inp} w-20 px-2 text-center`}
          />
          <button
            onClick={() => setRows(rows.filter((_, j) => j !== i))}
            aria-label="Odstrániť cvik"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition active:scale-90 active:bg-surface-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        onClick={() => setRows([...rows, { name: "", sets: "", reps: "" }])}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-2.5 text-sm font-medium text-muted transition active:scale-[0.99]"
      >
        <Plus className="h-4 w-4" strokeWidth={2.4} /> Pridať cvik
      </button>
    </div>
  );
}

function CreateSplitSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [rows, setRows] = useState<DraftExercise[]>([{ name: "", sets: "", reps: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!name.trim()) {
      setError("Zadaj názov tréningu.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const exercises = rows
        .filter((r) => r.name.trim())
        .map((r) => ({
          name: r.name.trim(),
          targetSets: r.sets ? Number(r.sets) : null,
          targetReps: r.reps.trim() || null,
        }));
      const res = await fetch("/api/splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), exercises }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Uloženie zlyhalo.");
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title="Nový tréning">
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="label-caps">Názov splitu</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="napr. Upper 1, Lower 1, Push, Pull"
            autoFocus
            className={inp}
          />
        </label>

        <div className="space-y-2">
          <span className="label-caps">Cviky</span>
          <ExerciseDraftRows rows={rows} setRows={setRows} />
        </div>

        {error && (
          <p className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-inset ring-error/20">
            {error}
          </p>
        )}

        <button
          onClick={save}
          disabled={busy || !name.trim()}
          className="w-full rounded-card bg-accent py-3.5 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? "Ukladám…" : "Vytvoriť tréning"}
        </button>
      </div>
    </Sheet>
  );
}

function EditSplitSheet({
  split,
  onClose,
  onChanged,
  onDeleted,
}: {
  split: Split;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(split.name);
  const [newEx, setNewEx] = useState<DraftExercise>({ name: "", sets: "", reps: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function rename() {
    if (!name.trim() || name.trim() === split.name) return;
    await fetch(`/api/splits/${split.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    await onChanged();
  }

  async function addExercise() {
    if (!newEx.name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/splits/${split.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addExercise",
          name: newEx.name.trim(),
          targetSets: newEx.sets ? Number(newEx.sets) : null,
          targetReps: newEx.reps.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Pridanie zlyhalo.");
      setNewEx({ name: "", sets: "", reps: "" });
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setBusy(false);
    }
  }

  async function removeExercise(id: string) {
    await fetch(`/api/splits/exercise/${id}`, { method: "DELETE" });
    await onChanged();
  }

  async function removeSplit() {
    setBusy(true);
    try {
      await fetch(`/api/splits/${split.id}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setBusy(false);
    }
  }

  // Vždy načítaj aktuálny stav cvikov zo splitu (po onChanged sa prop aktualizuje pri reloade zoznamu).
  return (
    <Sheet open onClose={onClose} title="Upraviť tréning">
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="label-caps">Názov splitu</span>
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className={`${inp} flex-1`} />
            <button
              onClick={rename}
              className="shrink-0 rounded-2xl bg-surface-3 px-4 text-sm font-semibold text-white ring-1 ring-inset ring-border transition active:scale-95"
            >
              Uložiť
            </button>
          </div>
        </label>

        <div className="space-y-2">
          <span className="label-caps">Cviky</span>
          <div className="divide-y divide-border overflow-hidden rounded-2xl bg-surface-2">
            {split.exercises.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted">Zatiaľ žiadne cviky.</p>
            )}
            {split.exercises.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg">{e.name}</p>
                  {(e.targetSets || e.targetReps) && (
                    <p className="text-xs text-muted tabular-nums">
                      {e.targetSets ?? "?"} × {e.targetReps ?? "?"}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeExercise(e.id)}
                  aria-label="Odstrániť cvik"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition active:scale-90 active:bg-surface-3"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="label-caps">Pridať cvik</span>
          <div className="flex items-center gap-2">
            <input
              value={newEx.name}
              onChange={(e) => setNewEx({ ...newEx, name: e.target.value })}
              placeholder="Názov cviku"
              className={`${inp} flex-1`}
            />
            <input
              value={newEx.sets}
              onChange={(e) => setNewEx({ ...newEx, sets: e.target.value })}
              inputMode="numeric"
              placeholder="série"
              className={`${inp} w-16 px-2 text-center`}
            />
            <input
              value={newEx.reps}
              onChange={(e) => setNewEx({ ...newEx, reps: e.target.value })}
              placeholder="opak."
              className={`${inp} w-20 px-2 text-center`}
            />
          </div>
          <button
            onClick={addExercise}
            disabled={busy || !newEx.name.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-2.5 text-sm font-medium text-muted transition active:scale-[0.99] disabled:opacity-60"
          >
            <Plus className="h-4 w-4" strokeWidth={2.4} /> Pridať cvik
          </button>
        </div>

        {error && (
          <p className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-inset ring-error/20">
            {error}
          </p>
        )}

        <button
          onClick={removeSplit}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-card border border-error/40 bg-error/10 py-3 text-sm font-semibold text-error transition active:scale-[0.99] disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} /> Zmazať celý tréning
        </button>
      </div>
    </Sheet>
  );
}
