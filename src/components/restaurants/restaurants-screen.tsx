"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { ChevronRight, Plus, Utensils } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";

type R = { id: string; name: string; address: string | null };

const inp =
  "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3.5 text-fg outline-none transition placeholder:text-muted/70 focus:border-accent";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.025 } },
};
const fade: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

export function RestaurantsScreen() {
  const reduce = useReducedMotion();
  const [list, setList] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/restaurants");
    if (res.ok) setList((await res.json()).restaurants ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Chyba.");
      setName("");
      setAddress("");
      setAdding(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-14 rounded-card" />
        <div className="skeleton h-16 rounded-card" />
        <div className="skeleton h-16 rounded-card" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-4"
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
    >
      <motion.button
        variants={fade}
        onClick={() => setAdding(true)}
        className="flex w-full items-center justify-center gap-2 rounded-card bg-accent py-3.5 font-semibold text-accent-fg shadow-[0_0_24px_rgba(168,255,62,0.16)] transition active:scale-[0.99]"
      >
        <Plus className="h-5 w-5" strokeWidth={2.4} />
        Pridať reštauráciu
      </motion.button>

      {list.length === 0 ? (
        <motion.div variants={fade} className="card p-6 text-center text-sm text-muted">
          Zatiaľ žiadne reštaurácie. Pridaj svoje obľúbené v Nitre + ich obedové menu – AI ich potom
          zaradí do návrhov obeda.
        </motion.div>
      ) : (
        <div className="space-y-2.5">
          {list.map((r) => (
            <motion.div key={r.id} variants={fade}>
              <Link
                href={`/restauracie/${r.id}`}
                className="card flex items-center gap-3 p-4 transition active:scale-[0.99]"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-3 text-accent">
                  <Utensils className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-fg">{r.name}</p>
                  {r.address && <p className="truncate text-xs text-muted">{r.address}</p>}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {adding && (
        <Sheet open onClose={() => setAdding(false)} title="Pridať reštauráciu">
          <form onSubmit={add} className="space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Názov" autoFocus className={inp} />
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Adresa (voliteľné)"
              className={inp}
            />
            {error && (
              <p className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-inset ring-error/20">
                {error}
              </p>
            )}
            <button
              disabled={busy}
              className="w-full rounded-card bg-accent py-3.5 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? "Ukladám…" : "Uložiť"}
            </button>
          </form>
        </Sheet>
      )}
    </motion.div>
  );
}
