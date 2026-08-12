"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Sparkles, Check, Ban, Pill, Target, Lightbulb, CalendarClock, RotateCcw } from "lucide-react";

type Supplement = { name: string; timing: string; reason: string };
type Protocol = {
  id: string;
  stateText: string;
  title: string;
  focus: string;
  rationale: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  daysLeft: number;
  principles: string[];
  emphasizeFoods: string[];
  avoidFoods: string[];
  supplements: Supplement[];
  expectations: string | null;
  active: boolean;
};

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const fade: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] } },
};

const inp =
  "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none transition placeholder:text-muted/70 focus:border-accent";

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.`;
}

const EXAMPLE =
  "napr. Posledné týždne som jedol veľa mastného a ťažkého, mám z toho akné a nafúknuté brucho. Potrebujem upokojiť trávenie, vyliečiť črevný mikrobióm a zbaviť sa akné.";

export function ProtocolScreen() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const res = await fetch("/api/protocol");
    if (res.ok) setActive((await res.json()).active);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/protocol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stateText: state }),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = `Chyba ${res.status}`;
        try {
          msg = JSON.parse(text).error ?? msg;
        } catch {}
        setError(msg);
        return;
      }
      setActive(JSON.parse(text).protocol);
      setState("");
      setShowForm(false);
    } catch {
      setError("Nepodarilo sa spojiť so serverom. Skús to znova.");
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    setBusy(true);
    try {
      await fetch("/api/protocol", { method: "DELETE" });
      setActive(null);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-28 rounded-card" />
        ))}
      </div>
    );
  }

  const showEditor = !active || showForm;

  return (
    <motion.div className="space-y-4 pb-4" variants={container} initial={reduce ? false : "hidden"} animate="show">
      {active && !showForm && (
        <>
          {/* hlavička protokolu */}
          <motion.div variants={fade} className="card relative overflow-hidden p-5">
            <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative flex items-center gap-2">
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent ring-1 ring-inset ring-accent/25">
                Aktívny protokol
              </span>
            </div>
            <h2 className="relative mt-2 text-xl font-bold leading-tight text-white">{active.title}</h2>
            <p className="relative mt-1.5 flex items-start gap-2 text-sm text-muted">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
              {active.focus}
            </p>

            {/* priebeh */}
            <div className="relative mt-4">
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" /> {shortDate(active.startDate)} – {shortDate(active.endDate)}
                </span>
                <span className="font-semibold text-fg">
                  {active.daysLeft > 0 ? `ostáva ${active.daysLeft} dní` : "dokončený"}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{
                    width: `${Math.min(100, ((active.durationDays - active.daysLeft) / active.durationDays) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </motion.div>

          {/* prečo */}
          <motion.div variants={fade} className="card flex gap-2.5 p-4">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
            <div>
              <p className="text-xs font-semibold text-white">Prečo tento prístup</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{active.rationale}</p>
            </div>
          </motion.div>

          {/* zásady */}
          {active.principles.length > 0 && (
            <motion.div variants={fade} className="card space-y-2.5 p-5">
              <h3 className="font-semibold text-white">Zásady protokolu</h3>
              <ul className="space-y-2">
                {active.principles.map((p, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-muted">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* zaraď / vyhni sa */}
          <div className="grid gap-4 sm:grid-cols-2">
            {active.emphasizeFoods.length > 0 && (
              <motion.div variants={fade} className="card space-y-2.5 p-5">
                <h3 className="flex items-center gap-2 font-semibold text-accent">
                  <Check className="h-4 w-4" strokeWidth={2.5} /> Zaraď
                </h3>
                <ul className="space-y-2">
                  {active.emphasizeFoods.map((f, i) => (
                    <li key={i} className="text-sm leading-relaxed text-muted">
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
            {active.avoidFoods.length > 0 && (
              <motion.div variants={fade} className="card space-y-2.5 p-5">
                <h3 className="flex items-center gap-2 font-semibold text-error">
                  <Ban className="h-4 w-4" strokeWidth={2.5} /> Vyhni sa
                </h3>
                <ul className="space-y-2">
                  {active.avoidFoods.map((f, i) => (
                    <li key={i} className="text-sm leading-relaxed text-muted">
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>

          {/* doplnky */}
          {active.supplements.length > 0 && (
            <motion.div variants={fade} className="card space-y-3 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <Pill className="h-4 w-4 text-accent" strokeWidth={1.75} /> Odporúčané doplnky
              </h3>
              <div className="space-y-2.5">
                {active.supplements.map((s, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-fg">
                        {s.name}
                        <span className="ml-2 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-normal text-muted">
                          {s.timing}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* očakávania */}
          {active.expectations && (
            <motion.div variants={fade} className="card p-4">
              <p className="text-xs font-semibold text-white">Čo môžeš čakať</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{active.expectations}</p>
            </motion.div>
          )}

          {/* info + akcie */}
          <motion.div variants={fade} className="rounded-2xl bg-accent/10 px-4 py-3 text-sm text-accent ring-1 ring-inset ring-accent/20">
            Podľa tohto protokolu sa teraz skladá tvoj denný jedálniček. Choď na Jedálniček a vygeneruj/regeneruj plán.
          </motion.div>

          <motion.div variants={fade} className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setShowForm(true);
                setState(active.stateText);
              }}
              className="flex items-center justify-center gap-2 rounded-card border border-border bg-surface-2/60 py-3 text-sm font-medium transition active:scale-[0.99]"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={2} /> Nový protokol
            </button>
            <button
              onClick={end}
              disabled={busy}
              className="rounded-card border border-error/40 bg-error/10 py-3 text-sm font-semibold text-error transition active:scale-[0.99] disabled:opacity-60"
            >
              Ukončiť protokol
            </button>
          </motion.div>
        </>
      )}

      {showEditor && (
        <motion.div variants={fade} className="card space-y-3 p-5">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 ring-1 ring-inset ring-accent/20">
            <Sparkles className="h-7 w-7 text-accent" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">{active ? "Nový protokol" : "Jedálniček podľa tvojho stavu"}</p>
            <p className="mx-auto mt-1 max-w-[40ch] text-sm leading-relaxed text-muted">
              Opíš, ako sa teraz cítiš a čo potrebuješ vyriešiť. AI ti navrhne cielený protokol s dobou
              dodržiavania a podľa neho začne skladať tvoje jedálničky.
            </p>
          </div>
          <textarea
            value={state}
            onChange={(e) => setState(e.target.value)}
            rows={5}
            placeholder={EXAMPLE}
            className={`${inp} resize-none text-sm leading-relaxed`}
          />
          {error && (
            <p className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-inset ring-error/20">
              {error}
            </p>
          )}
          <button
            onClick={generate}
            disabled={busy || state.trim().length < 10}
            className="flex w-full items-center justify-center gap-2 rounded-card bg-accent py-3.5 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" strokeWidth={2} />
            {busy ? "Navrhujem protokol…" : "Vytvoriť protokol"}
          </button>
          {busy && (
            <p className="text-center text-xs text-muted">
              AI analyzuje tvoj stav a skladá protokol na mieru — chvíľku to potrvá.
            </p>
          )}
          {active && showForm && !busy && (
            <button
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              className="w-full rounded-card border border-border bg-surface-2/60 py-2.5 text-sm font-medium text-muted transition active:scale-[0.99]"
            >
              Zrušiť
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
