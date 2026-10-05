"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Plus, Trash2, CalendarCheck } from "lucide-react";
import { DAYS } from "@/components/schedule/labels";

type Row = { dayOfWeek: number; focus: string };
type Phase = "IN_SEASON" | "BREAK";

const FOCUS_SUGGESTIONS = ["Nohy", "Vrch", "Push", "Pull", "Full-body"];

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } };
const fade: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

const inp =
  "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none transition placeholder:text-muted/70 focus:border-accent";

export function GymSplitScreen() {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<Phase>("IN_SEASON");
  const [rows, setRows] = useState<Record<Phase, Row[]>>({ IN_SEASON: [], BREAK: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newDay, setNewDay] = useState<number | null>(null);
  const [newFocus, setNewFocus] = useState("");

  async function load() {
    const res = await fetch("/api/gym-split");
    if (res.ok) {
      const d = await res.json();
      setRows({ IN_SEASON: d.template.IN_SEASON ?? [], BREAK: d.template.BREAK ?? [] });
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const current = rows[tab];
  const usedDays = new Set(current.map((r) => r.dayOfWeek));
  const availableDays = DAYS.filter((d) => !usedDays.has(d.value));

  function addRow() {
    const focus = newFocus.trim();
    if (newDay == null || !focus) return;
    setRows((r) => ({
      ...r,
      [tab]: [...r[tab], { dayOfWeek: newDay, focus }].sort((a, b) => {
        const ia = DAYS.findIndex((d) => d.value === a.dayOfWeek);
        const ib = DAYS.findIndex((d) => d.value === b.dayOfWeek);
        return ia - ib;
      }),
    }));
    setNewDay(null);
    setNewFocus("");
  }

  function removeRow(dayOfWeek: number) {
    setRows((r) => ({ ...r, [tab]: r[tab].filter((x) => x.dayOfWeek !== dayOfWeek) }));
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch("/api/gym-split", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: tab, days: current }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-12 rounded-card" />
        <div className="skeleton h-40 rounded-card" />
      </div>
    );
  }

  return (
    <motion.div className="space-y-4 pb-4" variants={container} initial={reduce ? false : "hidden"} animate="show">
      <motion.div variants={fade} className="flex gap-1 rounded-full bg-surface-2 p-1 text-sm">
        {(["IN_SEASON", "BREAK"] as Phase[]).map((p) => (
          <button
            key={p}
            onClick={() => setTab(p)}
            className={`flex-1 rounded-full py-2 font-medium transition active:scale-[0.98] ${
              tab === p ? "bg-accent text-accent-fg" : "text-muted"
            }`}
          >
            {p === "IN_SEASON" ? "V sezóne" : "V prestávke"}
          </button>
        ))}
      </motion.div>

      <motion.p variants={fade} className="px-1 text-xs leading-relaxed text-muted">
        {tab === "IN_SEASON"
          ? "Rozvrh, ktorý AI presne dodrží, keď sa hráš súťažne (blízko zápasov)."
          : "Rozvrh, ktorý AI presne dodrží počas medzisezónnej prestávky (viac objemu, žiadny tlak zápasu)."}
      </motion.p>

      <motion.div variants={fade} className="card overflow-hidden">
        {current.length === 0 ? (
          <p className="px-4 py-5 text-center text-sm text-muted">
            Zatiaľ žiadne dni. Pridaj nižšie, napr. Pondelok – Nohy.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {current.map((r) => (
              <div key={r.dayOfWeek} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm font-semibold text-fg">
                  {DAYS.find((d) => d.value === r.dayOfWeek)?.label ?? r.dayOfWeek}
                </span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-surface-3 px-3 py-1 text-xs font-medium text-accent">
                    {r.focus}
                  </span>
                  <button
                    onClick={() => removeRow(r.dayOfWeek)}
                    aria-label="Odstrániť deň"
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted transition active:scale-90 active:bg-surface-3"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {availableDays.length > 0 && (
        <motion.div variants={fade} className="card space-y-3 p-4">
          <p className="label-caps">Pridať deň</p>
          <div className="flex flex-wrap gap-1.5">
            {availableDays.map((d) => (
              <button
                key={d.value}
                onClick={() => setNewDay(d.value)}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-95 ${
                  newDay === d.value ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted ring-1 ring-inset ring-border"
                }`}
              >
                {d.short}
              </button>
            ))}
          </div>
          <input
            value={newFocus}
            onChange={(e) => setNewFocus(e.target.value)}
            placeholder="Zameranie (napr. Nohy, Vrch)"
            className={inp}
          />
          <div className="flex flex-wrap gap-1.5">
            {FOCUS_SUGGESTIONS.map((f) => (
              <button
                key={f}
                onClick={() => setNewFocus(f)}
                className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted ring-1 ring-inset ring-border transition active:scale-95"
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={addRow}
            disabled={newDay == null || !newFocus.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-2.5 text-sm font-medium text-muted transition active:scale-[0.99] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" strokeWidth={2.4} /> Pridať
          </button>
        </motion.div>
      )}

      <motion.button
        variants={fade}
        onClick={save}
        disabled={busy}
        className={`flex w-full items-center justify-center gap-2 rounded-card py-3.5 font-semibold transition active:scale-[0.99] disabled:opacity-60 ${
          saved ? "bg-accent/10 text-accent ring-1 ring-inset ring-accent/20" : "bg-accent text-accent-fg"
        }`}
      >
        {saved ? (
          <>
            <CalendarCheck className="h-[18px] w-[18px]" strokeWidth={2.5} /> Uložené
          </>
        ) : busy ? (
          "Ukladám…"
        ) : (
          "Uložiť rozvrh"
        )}
      </motion.button>
    </motion.div>
  );
}
