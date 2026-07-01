"use client";

import { useEffect, useState } from "react";
import { Watch, Plus, Trash2, Copy, Check, ChevronDown, RefreshCw } from "lucide-react";

type Burn = {
  id: string;
  kcal: number;
  workoutType: string | null;
  durationMin: number | null;
  source: "WATCH" | "MANUAL";
  occurredAt: string;
};

const inp =
  "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none transition placeholder:text-muted/70 focus:border-accent";

export function WorkoutSync() {
  const [burns, setBurns] = useState<Burn[]>([]);
  const [total, setTotal] = useState(0);
  const [kcal, setKcal] = useState("");
  const [type, setType] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [setupOpen, setSetupOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  async function loadBurns() {
    const res = await fetch("/api/workout");
    if (res.ok) {
      const d = await res.json();
      setBurns(d.burns ?? []);
      setTotal(d.totalKcal ?? 0);
    }
  }

  useEffect(() => {
    loadBurns();
  }, []);

  async function loadToken() {
    const res = await fetch("/api/workout/token");
    if (res.ok) setUrl((await res.json()).url ?? "");
  }

  async function openSetup() {
    setSetupOpen((v) => !v);
    if (!url) await loadToken();
  }

  async function addManual() {
    const k = Number(kcal);
    if (!(k > 0)) {
      setError("Zadaj výdaj v kcal.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kcal: k, workoutType: type.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Zápis zlyhal.");
      setKcal("");
      setType("");
      await loadBurns();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/workout?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadBurns();
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  async function regenerate() {
    const res = await fetch("/api/workout/token", { method: "POST" });
    if (res.ok) setUrl((await res.json()).url ?? "");
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-3 text-accent">
          <Watch className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-white">Výdaj z tréningu</h2>
          <p className="text-xs text-muted">Apple Watch (cez Skratku) alebo ručne → prepočíta denný cieľ</p>
        </div>
        {total > 0 && (
          <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-accent ring-1 ring-inset ring-accent/20">
            +{total} kcal
          </span>
        )}
      </div>

      {/* dnešné záznamy */}
      {burns.length > 0 && (
        <div className="divide-y divide-border overflow-hidden rounded-2xl bg-surface-2">
          {burns.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">
                  {b.workoutType || "Tréning"}
                  <span className="ml-1.5 text-[11px] font-normal text-muted">
                    {b.source === "WATCH" ? "⌚︎ Watch" : "ručne"}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-white">{b.kcal} kcal</span>
                <button
                  onClick={() => remove(b.id)}
                  aria-label="Zmazať"
                  className="grid h-7 w-7 place-items-center rounded-lg text-muted transition active:scale-90"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* manuálne pridanie */}
      <div className="flex gap-2">
        <input
          value={kcal}
          onChange={(e) => setKcal(e.target.value)}
          inputMode="numeric"
          placeholder="kcal"
          className={`w-24 ${inp}`}
        />
        <input
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="Typ (napr. futbal)"
          className={`flex-1 ${inp}`}
        />
        <button
          onClick={addManual}
          disabled={busy}
          aria-label="Pridať"
          className="grid w-12 shrink-0 place-items-center rounded-2xl bg-accent text-accent-fg transition active:scale-95 disabled:opacity-60"
        >
          <Plus className="h-5 w-5" strokeWidth={2.4} />
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-inset ring-error/20">
          {error}
        </p>
      )}

      {/* nastavenie Apple Watch skratky */}
      <button
        onClick={openSetup}
        className="flex w-full items-center justify-between rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm font-medium text-fg transition active:scale-[0.99]"
      >
        <span className="flex items-center gap-2">
          <Watch className="h-4 w-4 text-accent" strokeWidth={2} /> Nastaviť automatický sync z Apple Watch
        </span>
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${setupOpen ? "rotate-180" : ""}`} />
      </button>

      {setupOpen && (
        <div className="space-y-3 rounded-2xl bg-surface-2 p-3.5 text-xs text-muted">
          <p className="text-sm font-semibold text-white">iOS Skratka + Automatizácia (raz)</p>
          <ol className="list-decimal space-y-1.5 pl-4 marker:text-accent">
            <li>
              Appka <span className="font-medium text-fg">Skratky</span> → záložka{" "}
              <span className="font-medium text-fg">Automatizácia</span> → <span className="font-medium text-fg">+</span> → „Tréning“ → <span className="font-medium text-fg">Skončí sa</span>.
            </li>
            <li>
              Pridaj akciu, ktorá získa <span className="font-medium text-fg">aktívne kalórie</span> tréningu (Health / „Aktívna energia“).
            </li>
            <li>
              Pridaj akciu — hore do vyhľadávania napíš <span className="font-medium text-fg">URL</span> a vyber{" "}
              <span className="font-medium text-fg">„Získať obsah URL“</span> (kategória{" "}
              <span className="font-medium text-fg">Web</span>). Pozor: NIE „Otvoriť URL adresy“.
            </li>
            <li>
              Do poľa URL vlož adresu nižšie, na koniec dopíš{" "}
              <span className="font-mono text-fg">&amp;kcal=</span> a cez lištu nad klávesnicou vlož{" "}
              <span className="font-medium text-fg">premennú</span> s kalóriami z kroku 2. Metóda ostane{" "}
              <span className="font-medium text-fg">GET</span>.
            </li>
            <li>
              Vypni <span className="font-medium text-fg">„Pýtať sa pred spustením“</span>. Hotovo — po každom tréningu sa výdaj pošle sám.
            </li>
          </ol>

          <p className="rounded-lg bg-bg px-3 py-2 leading-relaxed">
            <span className="font-medium text-fg">Kroky zo Zdravia:</span> urob druhú automatizáciu{" "}
            <span className="font-medium text-fg">„Denný čas“</span> (napr. 22:00) → akcia s dnešnými{" "}
            <span className="font-medium text-fg">krokmi</span> → tá istá URL, len namiesto{" "}
            <span className="font-mono text-fg">&amp;kcal=</span> daj <span className="font-mono text-fg">&amp;steps=</span>.
          </p>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg">{url || "…"}</span>
            <button
              onClick={copyUrl}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-medium text-fg transition active:scale-95"
            >
              {copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
              {copied ? "Skopírované" : "Kopírovať"}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[11px]">Tento odkaz je tvoj tajný — nezdieľaj ho.</p>
            <button
              onClick={regenerate}
              className="flex items-center gap-1 text-[11px] font-medium text-muted transition active:opacity-70"
            >
              <RefreshCw className="h-3 w-3" /> Vygenerovať nový
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
