"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Plus } from "lucide-react";
import {
  DAYS,
  INTENSITY_LABEL,
  TYPE_LABEL,
  formatShortDate,
  isRestLike,
  type EventType,
  type SEvent,
} from "./labels";
import { ScheduleEventSheet } from "./schedule-event-sheet";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.025 } },
};
const fade: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

const TYPE_COLOR: Record<EventType, string> = {
  FOOTBALL_TRAINING: "var(--color-accent)",
  GYM: "var(--color-fat)",
  MATCH: "var(--color-protein)",
  REST: "var(--color-muted)",
  ACTIVE_RECOVERY: "var(--color-muted)",
  TENNIS: "var(--color-carbs)",
  SWIMMING: "var(--color-carbs)",
  RUNNING: "var(--color-protein)",
  CUSTOM: "var(--color-carbs)",
};

function eventMeta(e: SEvent): string {
  const parts: string[] = [];
  if (!e.isRecurring && e.date) parts.push(formatShortDate(e.date));
  if (e.startTime) parts.push(e.startTime);
  if (e.durationMin) parts.push(`${e.durationMin} min`);
  if (!isRestLike(e.type)) parts.push(INTENSITY_LABEL[e.intensity]);
  if (e.gymFocus) parts.push(e.gymFocus);
  return parts.join(" · ") || "—";
}

function EventRow({ e, onEdit }: { e: SEvent; onEdit: (e: SEvent) => void }) {
  return (
    <button
      onClick={() => onEdit(e)}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-surface-2"
    >
      <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: TYPE_COLOR[e.type] }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{e.title || TYPE_LABEL[e.type]}</p>
        <p className="truncate text-xs text-muted">{eventMeta(e)}</p>
      </div>
      {e.estimatedKcal != null && (
        <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-accent ring-1 ring-inset ring-accent/20">
          ~{e.estimatedKcal} kcal
        </span>
      )}
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="card divide-y divide-border overflow-hidden">{children}</div>;
}

export function ScheduleScreen() {
  const reduce = useReducedMotion();
  const [events, setEvents] = useState<SEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<{ mode: "add" } | { mode: "edit"; event: SEvent } | null>(null);

  async function load() {
    const res = await fetch("/api/schedule");
    if (res.ok) setEvents((await res.json()).events ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-14 rounded-card" />
        <div className="skeleton h-24 rounded-card" />
        <div className="skeleton h-24 rounded-card" />
      </div>
    );
  }

  const recurring = events.filter((e) => e.isRecurring);
  const oneoff = events
    .filter((e) => !e.isRecurring)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const onEdit = (event: SEvent) => setSheet({ mode: "edit", event });

  return (
    <motion.div
      className="space-y-6"
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
    >
      <motion.button
        variants={fade}
        onClick={() => setSheet({ mode: "add" })}
        className="flex w-full items-center justify-center gap-2 rounded-card bg-accent py-3.5 font-semibold text-accent-fg shadow-[0_0_24px_rgba(168,255,62,0.16)] transition active:scale-[0.99]"
      >
        <Plus className="h-5 w-5" strokeWidth={2.4} />
        Pridať udalosť
      </motion.button>

      <motion.section variants={fade} className="space-y-3">
        <h2 className="label-caps px-1">Opakuje sa týždenne</h2>
        {recurring.length === 0 ? (
          <div className="card p-4 text-sm text-muted">
            Žiadne pravidelné tréningy. Pridaj futbal/posilňovňu, aby sa cieľ v tréningový deň
            automaticky zvýšil.
          </div>
        ) : (
          <div className="space-y-3">
            {DAYS.filter((d) => recurring.some((e) => e.dayOfWeek === d.value)).map((d) => (
              <div key={d.value}>
                <p className="mb-1.5 px-1 text-xs font-semibold text-fg">{d.label}</p>
                <Card>
                  {recurring
                    .filter((e) => e.dayOfWeek === d.value)
                    .map((e) => (
                      <EventRow key={e.id} e={e} onEdit={onEdit} />
                    ))}
                </Card>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      <motion.section variants={fade} className="space-y-3">
        <h2 className="label-caps px-1">Jednorazové</h2>
        {oneoff.length === 0 ? (
          <div className="card p-4 text-sm text-muted">
            Žiadne jednorazové udalosti (zápas, voľno, dovolenka).
          </div>
        ) : (
          <Card>
            {oneoff.map((e) => (
              <EventRow key={e.id} e={e} onEdit={onEdit} />
            ))}
          </Card>
        )}
      </motion.section>

      {sheet && (
        <ScheduleEventSheet
          event={sheet.mode === "edit" ? sheet.event : undefined}
          onClose={() => setSheet(null)}
          onSaved={(evs) => {
            setEvents(evs);
            setSheet(null);
          }}
        />
      )}
    </motion.div>
  );
}
