"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/sheet";

const ENERGY = ["😴", "😕", "😐", "🙂", "⚡"];
const SLEEP = ["😵", "😕", "😐", "🙂", "😃"];
const FATIGUE = ["💪", "🙂", "😐", "😣", "🥵"];

function Scale({
  emojis,
  value,
  onChange,
}: {
  emojis: string[];
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {emojis.map((e, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 rounded-2xl py-3 text-xl transition active:scale-95 ${
              value === n ? "bg-accent/15 ring-1 ring-inset ring-accent/40" : "bg-surface-2"
            }`}
          >
            {e}
          </button>
        );
      })}
    </div>
  );
}

// Zobrazí sa raz denne pri prvom otvorení appky (ak check-in ešte nie je vyplnený).
export function MorningCheckin() {
  const [open, setOpen] = useState(false);
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleepQuality, setSleep] = useState<number | null>(null);
  const [muscleFatigue, setFatigue] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      // Preskočené v tejto session? Neotravuj.
      if (typeof window !== "undefined" && sessionStorage.getItem("checkinSkipped") === "1") return;
      try {
        const res = await fetch("/api/checkin");
        if (res.ok) {
          const d = await res.json();
          if (!d.checkin) setOpen(true);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  function skip() {
    if (typeof window !== "undefined") sessionStorage.setItem("checkinSkipped", "1");
    setOpen(false);
  }

  async function save() {
    if (!energy || !sleepQuality || !muscleFatigue) return;
    setBusy(true);
    try {
      await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ energy, sleepQuality, muscleFatigue, note: note.trim() || null }),
      });
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const ready = energy && sleepQuality && muscleFatigue;

  return (
    <Sheet open onClose={skip} title="Ranný check-in">
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted">
          30 sekúnd — AI podľa toho upraví dnešný tréning aj jedálniček.
        </p>

        <div className="space-y-1.5">
          <p className="label-caps">Energia dnes ráno</p>
          <Scale emojis={ENERGY} value={energy} onChange={setEnergy} />
        </div>

        <div className="space-y-1.5">
          <p className="label-caps">Kvalita spánku</p>
          <Scale emojis={SLEEP} value={sleepQuality} onChange={setSleep} />
        </div>

        <div className="space-y-1.5">
          <p className="label-caps">Únava svalov (1 = svieže, 5 = veľmi unavené)</p>
          <Scale emojis={FATIGUE} value={muscleFatigue} onChange={setFatigue} />
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Poznámka (voliteľné)"
          className="w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none transition placeholder:text-muted/70 focus:border-accent"
        />

        <button
          onClick={save}
          disabled={!ready || busy}
          className="w-full rounded-card bg-accent py-3.5 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-50"
        >
          {busy ? "Ukladám…" : "Uložiť check-in"}
        </button>
        <button onClick={skip} className="w-full py-2 text-sm font-medium text-muted transition active:opacity-70">
          Dnes preskočiť
        </button>
      </div>
    </Sheet>
  );
}
