"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { ShoppingBasket, Check, Sparkles, Info, Wallet } from "lucide-react";

type ShopItem = {
  name: string;
  product: string;
  amount: string;
  priceEur: number;
  why: string;
  checked?: boolean;
};
type ShopGroup = { shop: string; items: ShopItem[]; subtotalEur: number };
type List = {
  id: string;
  fromDate: string;
  toDate: string;
  groups: ShopGroup[];
  totalEur: number;
  note: string | null;
  budgetNote: string | null;
};

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } };
const fade: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

const BUDGET_MAX = 60;

function eur(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} €`;
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.`;
}

export function ShoppingScreen() {
  const reduce = useReducedMotion();
  const [list, setList] = useState<List | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/shopping");
      if (res.ok) setList((await res.json()).list);
      setLoading(false);
    })();
  }, []);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
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
      setList(JSON.parse(text).list);
    } catch {
      setError("Nepodarilo sa spojiť so serverom. Skús to znova.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(gi: number, ii: number, checked: boolean) {
    if (!list) return;
    // optimisticky – nech to je okamžité
    const next = structuredClone(list);
    next.groups[gi].items[ii].checked = checked;
    setList(next);

    await fetch("/api/shopping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: list.id, groupIndex: gi, itemIndex: ii, checked }),
    });
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-24 rounded-card" />
        ))}
      </div>
    );
  }

  const done = list?.groups.flatMap((g) => g.items).filter((i) => i.checked).length ?? 0;
  const total = list?.groups.flatMap((g) => g.items).length ?? 0;
  const overBudget = (list?.totalEur ?? 0) > BUDGET_MAX;

  return (
    <motion.div className="space-y-4 pb-4" variants={container} initial={reduce ? false : "hidden"} animate="show">
      {!list && (
        <motion.div variants={fade} className="card space-y-3 p-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 ring-1 ring-inset ring-accent/20">
            <ShoppingBasket className="h-7 w-7 text-accent" strokeWidth={1.5} />
          </div>
          <p className="font-semibold text-white">Zatiaľ žiadny nákupný zoznam</p>
          <p className="mx-auto max-w-[36ch] text-sm leading-relaxed text-muted">
            AI ti z jedálničkov na najbližších 7 dní poskladá jeden nákup — rozdelený podľa obchodov,
            s konkrétnymi produktmi, množstvom a odhadom ceny.
          </p>
        </motion.div>
      )}

      {list && (
        <>
          <motion.div variants={fade} className="card relative overflow-hidden p-5">
            <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative flex items-center justify-between">
              <p className="label-caps">
                Nákup {shortDate(list.fromDate)}–{shortDate(list.toDate)}
              </p>
              <span className="text-xs text-muted tabular-nums">
                {done}/{total}
              </span>
            </div>
            <div className="relative mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-white tabular-nums">
                {eur(list.totalEur)}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                  overBudget
                    ? "bg-warn/15 text-warn ring-warn/25"
                    : "bg-accent/15 text-accent ring-accent/25"
                }`}
              >
                {overBudget ? "nad rozpočet" : "v rozpočte"}
              </span>
            </div>
            <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div
                className={`h-full rounded-full transition-all ${overBudget ? "bg-warn" : "bg-accent"}`}
                style={{ width: `${Math.min(100, (list.totalEur / BUDGET_MAX) * 100)}%` }}
              />
            </div>
            <p className="relative mt-1.5 text-[11px] text-muted">Cieľový rozpočet 50–60 € / týždeň</p>

            {list.budgetNote && (
              <p className="relative mt-3 flex gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm leading-relaxed text-muted">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                {list.budgetNote}
              </p>
            )}
          </motion.div>

          {list.groups.map((g, gi) => (
            <motion.div key={`${g.shop}-${gi}`} variants={fade} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <h2 className="font-semibold text-white">{g.shop}</h2>
                <span className="text-sm font-semibold tabular-nums text-accent">{eur(g.subtotalEur)}</span>
              </div>
              <ul>
                {g.items.map((it, ii) => (
                  <li key={`${it.name}-${ii}`} className="border-b border-border last:border-0">
                    <button
                      onClick={() => toggle(gi, ii, !it.checked)}
                      className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition active:bg-surface-2"
                    >
                      <span
                        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md ring-1 ring-inset transition ${
                          it.checked
                            ? "bg-accent text-accent-fg ring-accent"
                            : "bg-surface-2 ring-border"
                        }`}
                      >
                        {it.checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>

                      <span className={`min-w-0 flex-1 ${it.checked ? "opacity-45" : ""}`}>
                        <span className="flex items-baseline justify-between gap-3">
                          <span
                            className={`font-medium text-fg ${it.checked ? "line-through" : ""}`}
                          >
                            {it.name}
                          </span>
                          <span className="shrink-0 text-sm tabular-nums text-muted">
                            {eur(it.priceEur)}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-sm text-accent">
                          {it.product} · {it.amount}
                        </span>
                        {it.why && (
                          <span className="mt-1 block text-xs leading-relaxed text-muted">{it.why}</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}

          {list.note && (
            <motion.div variants={fade} className="card flex gap-2.5 p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
              <p className="text-sm leading-relaxed text-muted">{list.note}</p>
            </motion.div>
          )}
        </>
      )}

      {error && (
        <motion.p
          variants={fade}
          className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-inset ring-error/20"
        >
          {error}
        </motion.p>
      )}

      <motion.button
        variants={fade}
        onClick={generate}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-card bg-accent py-3.5 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
      >
        <Sparkles className="h-4 w-4" strokeWidth={2} />
        {busy ? "Skladám nákup…" : list ? "Vygenerovať nový zoznam" : "Vygenerovať nákupný zoznam"}
      </motion.button>

      {busy && (
        <p className="text-center text-xs text-muted">
          Sumarizujem suroviny zo všetkých dní a vyberám konkrétne produkty — môže to trvať aj minútu.
        </p>
      )}
    </motion.div>
  );
}
