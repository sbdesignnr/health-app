"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, Copy, Footprints, RefreshCw } from "lucide-react";

type StepsDay = { date: string; steps: number };
type StepsData = {
  date: string;
  steps: number;
  goal: number;
  syncedAt: string | null;
  week: StepsDay[];
  syncUrl?: string;
};

const DOW = ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"];

function dayLetter(iso: string): string {
  return DOW[new Date(`${iso}T12:00:00Z`).getUTCDay()];
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("sk-SK", {
    timeZone: "Europe/Bratislava",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function fmtDay(iso: string): string {
  return new Intl.DateTimeFormat("sk-SK", {
    timeZone: "Europe/Bratislava",
    day: "numeric",
    month: "numeric",
  }).format(new Date(iso));
}

function isToday(iso: string): boolean {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return iso.slice(0, 10) === today;
}

export function StepsCard() {
  const reduce = useReducedMotion();
  const [data, setData] = useState<StepsData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const [setupOpen, setSetupOpen] = useState(false);
  const [syncUrl, setSyncUrl] = useState("");
  const [copied, setCopied] = useState(false);

  async function load(withSetup = false) {
    const res = await fetch(`/api/steps${withSetup ? "?setup=1" : ""}`);
    if (res.ok) {
      const d: StepsData = await res.json();
      setData(d);
      if (d.syncUrl) setSyncUrl(d.syncUrl);
    }
    setLoaded(true);
  }

  useEffect(() => {
    load();
  }, []);

  async function openSetup() {
    const next = !setupOpen;
    setSetupOpen(next);
    if (next && !syncUrl) await load(true);
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(syncUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  async function save() {
    const n = Number(input);
    if (!Number.isFinite(n) || n < 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: n }),
      });
      if (res.ok) setData(await res.json());
      setEditing(false);
      setInput("");
    } finally {
      setBusy(false);
    }
  }

  const steps = data?.steps ?? 0;
  const goal = data?.goal ?? 9000;
  const week = data?.week ?? [];
  const pct = goal > 0 ? Math.min(1, steps / goal) : 0;
  const remaining = Math.max(0, goal - steps);
  const kcalEquiv = Math.round(remaining * 0.04); // ~0.04 kcal/krok
  const done = steps >= goal && steps > 0;
  const weekMax = Math.max(goal, ...week.map((w) => w.steps), 1);

  const syncedToday = data?.syncedAt && isToday(data.syncedAt) ? fmtTime(data.syncedAt) : null;
  const hint = !loaded
    ? ""
    : steps === 0
      ? "Zatiaľ 0 krokov — nastav si automatický sync zo Zdravia (nižšie), alebo zadaj ručne."
      : done
        ? "Cieľ krokov splnený — super!"
        : `Dober ~${remaining.toLocaleString("sk-SK")} krokov, alebo uber ~${kcalEquiv} kcal.`;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Footprints className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <span className="label-caps">Kroky</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold tabular-nums text-white">
            {steps.toLocaleString("sk-SK")}
            <span className="text-xs font-normal text-muted"> / {goal.toLocaleString("sk-SK")}</span>
          </span>
          <button
            onClick={() => {
              setEditing((v) => !v);
              setInput(steps ? String(steps) : "");
            }}
            className="text-[11px] font-medium text-muted transition active:opacity-70"
          >
            upraviť
          </button>
        </div>
      </div>

      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className={`h-full rounded-full ${done ? "bg-accent" : "bg-gradient-to-r from-fat/60 via-accent/80 to-accent"}`}
          initial={{ width: reduce ? `${pct * 100}%` : "0%" }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: reduce ? 0 : 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </div>

      {hint && <p className="mt-2 text-[11px] text-muted">{hint}</p>}

      {/* posledných 7 dní – hneď vidno, či sync reálne beží */}
      {loaded && week.some((w) => w.steps > 0) && (
        <div className="mt-3 flex items-end justify-between gap-1.5">
          {week.map((w) => {
            const h = Math.max(3, Math.round((w.steps / weekMax) * 34));
            const hit = w.steps >= goal;
            return (
              <div key={w.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-[34px] w-full items-end">
                  <div
                    className={`w-full rounded-[3px] ${hit ? "bg-accent" : w.steps > 0 ? "bg-accent/35" : "bg-surface-3"}`}
                    style={{ height: `${h}px` }}
                  />
                </div>
                <span className="text-[9px] text-muted">{dayLetter(w.date)}</span>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="mt-2.5 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            inputMode="numeric"
            placeholder="Počet krokov"
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-base text-fg outline-none transition placeholder:text-muted/70 focus:border-accent"
          />
          <button
            onClick={save}
            disabled={busy}
            className="shrink-0 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg transition active:scale-95 disabled:opacity-60"
          >
            {busy ? "…" : "Uložiť"}
          </button>
        </div>
      )}

      {/* ── Automatický sync zo Zdravia ── */}
      <button
        onClick={openSetup}
        className="mt-3 flex w-full items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-left text-xs font-medium text-fg transition active:scale-[0.99]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} />
          <span className="truncate">
            {syncedToday ? `Zo Zdravia naposledy o ${syncedToday}` : "Sync krokov z appky Zdravie"}
          </span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${setupOpen ? "rotate-180" : ""}`}
        />
      </button>

      {setupOpen && (
        <div className="mt-2 space-y-3 rounded-2xl bg-surface-2 p-3.5 text-[11px] leading-relaxed text-muted">
          <p className="text-sm font-semibold text-white">Automatizácia v Skratkách (nastavíš raz)</p>
          <ol className="list-decimal space-y-2 pl-4 marker:text-accent">
            <li>
              Appka <span className="font-medium text-fg">Skratky</span> → záložka{" "}
              <span className="font-medium text-fg">Automatizácia</span> →{" "}
              <span className="font-medium text-fg">+</span> → <span className="font-medium text-fg">Denný čas</span>{" "}
              → napr. <span className="font-medium text-fg">21:00</span>, Denne →{" "}
              <span className="font-medium text-fg">Spustiť okamžite</span> (vypni „Pýtať sa pred spustením“).
            </li>
            <li>
              Akcia <span className="font-medium text-fg">„Nájsť vzorky zdravia“</span> → Typ vzorky:{" "}
              <span className="font-medium text-fg">Kroky</span>, filter{" "}
              <span className="font-medium text-fg">Dátum začiatku je dnes</span>.
            </li>
            <li>
              Akcia <span className="font-medium text-fg">„Vypočítať štatistiku“</span> → operácia{" "}
              <span className="font-medium text-fg">Súčet</span> (vstup = vzorky z kroku 2). Toto je dôležité —
              bez súčtu posiela Skratka zoznam, nie číslo.
            </li>
            <li>
              Akcia <span className="font-medium text-fg">„Získať obsah URL“</span> (NIE „Otvoriť URL adresy“),
              metóda <span className="font-medium text-fg">GET</span>. Do poľa URL vlož adresu nižšie a na jej{" "}
              <span className="font-medium text-fg">koniec</span> vlož cez lištu nad klávesnicou premennú{" "}
              <span className="font-medium text-fg">Štatistika</span> z kroku 3.
            </li>
          </ol>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg">{syncUrl || "…"}</span>
            <button
              onClick={copyUrl}
              disabled={!syncUrl}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-medium text-fg transition active:scale-95 disabled:opacity-50"
            >
              {copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
              {copied ? "Skopírované" : "Kopírovať"}
            </button>
          </div>

          <p className="rounded-lg bg-bg px-3 py-2">
            <span className="font-medium text-fg">Tip:</span> urob si rovnaké automatizácie na viac časov (napr.
            12:00, 17:00, 21:00). Appka vždy ponechá vyššiu hodnotu dňa, takže sa kroky cez deň priebežne
            dopĺňajú a vidíš ich aj poobede.
          </p>

          <p>
            <span className="font-medium text-fg">Nejde to?</span> Spusti skratku ručne — ak je všetko v
            poriadku, odpoveď obsahuje <span className="font-mono text-fg">{'{"ok":true,"steps":…}'}</span>. Ak
            vidíš <span className="font-mono text-fg">chýba… steps</span>, do URL sa nevložila premenná so
            súčtom z kroku 3.
          </p>

          {data?.syncedAt && (
            <p className="border-t border-border pt-2.5">
              Posledný zápis krokov: <span className="font-medium text-fg">{fmtDay(data.syncedAt)}</span> o{" "}
              <span className="font-medium text-fg">{fmtTime(data.syncedAt)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
