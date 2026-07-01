"use client";

import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import {
  DAYS,
  GYM_FOCUS_OPTS,
  INTENSITY_LABEL,
  INTENSITY_OPTS,
  TYPE_LABEL,
  TYPE_OPTS,
  type EventType,
  type Intensity,
  type SEvent,
} from "./labels";

const inp =
  "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3.5 text-fg outline-none transition placeholder:text-muted/70 focus:border-accent";

function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted">{label}</p>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-95 ${
        active ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted ring-1 ring-inset ring-border"
      }`}
    >
      {children}
    </button>
  );
}

export function ScheduleEventSheet({
  event,
  onClose,
  onSaved,
}: {
  event?: SEvent;
  onClose: () => void;
  onSaved: (events: SEvent[]) => void;
}) {
  const [type, setType] = useState<EventType>(event?.type ?? "FOOTBALL_TRAINING");
  const [isRecurring, setIsRecurring] = useState(event?.isRecurring ?? true);
  const [dayOfWeek, setDayOfWeek] = useState<number>(event?.dayOfWeek ?? 2);
  const [date, setDate] = useState(event?.date ?? todayStr());
  const [startTime, setStartTime] = useState(event?.startTime ?? "");
  const [durationMin, setDurationMin] = useState(event?.durationMin != null ? String(event.durationMin) : "");
  const [intensity, setIntensity] = useState<Intensity>(event?.intensity ?? "MEDIUM");
  const [gymFocus, setGymFocus] = useState(event?.gymFocus ?? "");
  const [title, setTitle] = useState(event?.title ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isRest = type === "REST";
  const isGym = type === "GYM";

  async function submit(method: "POST" | "PATCH" | "DELETE") {
    setBusy(true);
    setError("");
    try {
      const url = event ? `/api/schedule/${event.id}` : "/api/schedule";
      const init: RequestInit =
        method === "DELETE"
          ? { method }
          : {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type,
                isRecurring,
                dayOfWeek,
                date,
                startTime: startTime || null,
                durationMin: durationMin ? Number(durationMin) : null,
                intensity,
                gymFocus: isGym ? gymFocus || null : null,
                title: title || null,
              }),
            };
      const res = await fetch(url, init);
      if (!res.ok) throw new Error((await res.json()).error ?? "Operácia zlyhala.");
      const data = await res.json();
      onSaved(data.events ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
      setBusy(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title={event ? "Upraviť udalosť" : "Pridať udalosť"}>
      <div className="space-y-4">
        <Section label="Typ">
          <div className="flex flex-wrap gap-1.5">
            {TYPE_OPTS.map((t) => (
              <Chip key={t} active={type === t} onClick={() => setType(t)}>
                {TYPE_LABEL[t]}
              </Chip>
            ))}
          </div>
        </Section>

        <Section label="Opakovanie">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsRecurring(true)}
              className={`flex-1 rounded-2xl py-2.5 text-sm font-medium transition active:scale-[0.98] ${
                isRecurring ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted ring-1 ring-inset ring-border"
              }`}
            >
              Týždenne
            </button>
            <button
              type="button"
              onClick={() => setIsRecurring(false)}
              className={`flex-1 rounded-2xl py-2.5 text-sm font-medium transition active:scale-[0.98] ${
                !isRecurring ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted ring-1 ring-inset ring-border"
              }`}
            >
              Jednorazovo
            </button>
          </div>
        </Section>

        {isRecurring ? (
          <Section label="Deň">
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => (
                <Chip key={d.value} active={dayOfWeek === d.value} onClick={() => setDayOfWeek(d.value)}>
                  {d.short}
                </Chip>
              ))}
            </div>
          </Section>
        ) : (
          <Section label="Dátum">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
          </Section>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Section label="Čas">
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inp} />
          </Section>
          <Section label="Dĺžka (min)">
            <input
              inputMode="numeric"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              placeholder={isRest ? "—" : "napr. 90"}
              className={inp}
            />
          </Section>
        </div>

        {!isRest && (
          <Section label="Intenzita">
            <div className="flex flex-wrap gap-1.5">
              {INTENSITY_OPTS.map((i) => (
                <Chip key={i} active={intensity === i} onClick={() => setIntensity(i)}>
                  {INTENSITY_LABEL[i]}
                </Chip>
              ))}
            </div>
          </Section>
        )}

        {isGym && (
          <Section label="Typ tréningu">
            <div className="flex flex-wrap gap-1.5">
              {GYM_FOCUS_OPTS.map((g) => (
                <Chip key={g} active={gymFocus === g} onClick={() => setGymFocus(gymFocus === g ? "" : g)}>
                  {g}
                </Chip>
              ))}
            </div>
          </Section>
        )}

        <Section label="Názov (voliteľné)">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="napr. Tréning A-tím" className={inp} />
        </Section>

        {error && <p className="text-sm text-protein">{error}</p>}

        <button
          onClick={() => submit(event ? "PATCH" : "POST")}
          disabled={busy}
          className="w-full rounded-card bg-accent py-3.5 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? "Ukladám…" : "Uložiť"}
        </button>

        {event && (
          <button
            onClick={() => submit("DELETE")}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-card border border-error/40 bg-error/10 py-3 text-sm font-semibold text-error transition active:scale-[0.99] disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Zmazať udalosť
          </button>
        )}
      </div>
    </Sheet>
  );
}
