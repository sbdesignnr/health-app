"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  DAYS,
  INTENSITY_LABEL,
  TYPE_LABEL,
  formatShortDate,
  isRestLike,
  type SEvent,
} from "./labels";
import { ScheduleEventSheet } from "./schedule-event-sheet";

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
      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition active:bg-surface-2"
    >
      <div className="min-w-0">
        <p className="truncate text-sm">{e.title || TYPE_LABEL[e.type]}</p>
        <p className="truncate text-xs text-muted">{eventMeta(e)}</p>
      </div>
      {e.estimatedKcal != null && (
        <span className="shrink-0 text-xs tabular-nums text-accent">~{e.estimatedKcal} kcal</span>
      )}
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
      {children}
    </div>
  );
}

export function ScheduleScreen() {
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
    return <div className="h-40 animate-pulse rounded-card border border-border bg-surface" />;
  }

  const recurring = events.filter((e) => e.isRecurring);
  const oneoff = events
    .filter((e) => !e.isRecurring)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const onEdit = (event: SEvent) => setSheet({ mode: "edit", event });

  return (
    <div className="space-y-6">
      <button
        onClick={() => setSheet({ mode: "add" })}
        className="flex w-full items-center justify-center gap-2 rounded-card bg-accent py-3.5 font-semibold text-accent-fg transition active:scale-[0.99]"
      >
        <Plus className="h-5 w-5" strokeWidth={2.4} />
        Pridať udalosť
      </button>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted">Opakuje sa týždenne</h2>
        {recurring.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-4 text-sm text-muted">
            Žiadne pravidelné tréningy. Pridaj futbal/posilňovňu, aby sa cieľ v tréningový deň
            automaticky zvýšil.
          </p>
        ) : (
          DAYS.filter((d) => recurring.some((e) => e.dayOfWeek === d.value)).map((d) => (
            <div key={d.value}>
              <p className="mb-1.5 px-1 text-xs font-medium text-muted">{d.label}</p>
              <Card>
                {recurring
                  .filter((e) => e.dayOfWeek === d.value)
                  .map((e) => (
                    <EventRow key={e.id} e={e} onEdit={onEdit} />
                  ))}
              </Card>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted">Jednorazové</h2>
        {oneoff.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-4 text-sm text-muted">
            Žiadne jednorazové udalosti (zápas, voľno, dovolenka).
          </p>
        ) : (
          <Card>
            {oneoff.map((e) => (
              <EventRow key={e.id} e={e} onEdit={onEdit} />
            ))}
          </Card>
        )}
      </section>

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
    </div>
  );
}
