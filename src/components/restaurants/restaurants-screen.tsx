"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";

type R = { id: string; name: string; address: string | null };

const inp =
  "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none transition focus:border-accent";

export function RestaurantsScreen() {
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
    return <div className="h-24 animate-pulse rounded-card border border-border bg-surface" />;
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setAdding(true)}
        className="flex w-full items-center justify-center gap-2 rounded-card bg-accent py-3.5 font-semibold text-accent-fg transition active:scale-[0.99]"
      >
        <Plus className="h-5 w-5" strokeWidth={2.4} />
        Pridať reštauráciu
      </button>

      {list.length === 0 ? (
        <p className="rounded-card border border-border bg-surface p-4 text-sm text-muted">
          Zatiaľ žiadne reštaurácie. Pridaj svoje obľúbené v Nitre + ich obedové menu – AI ich
          potom zaradí do návrhov obeda.
        </p>
      ) : (
        <div className="space-y-2">
          {list.map((r) => (
            <Link
              key={r.id}
              href={`/restauracie/${r.id}`}
              className="flex items-center justify-between rounded-card border border-border bg-surface p-4 transition active:scale-[0.99]"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{r.name}</p>
                {r.address && <p className="truncate text-xs text-muted">{r.address}</p>}
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
            </Link>
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
            {error && <p className="text-sm text-protein">{error}</p>}
            <button
              disabled={busy}
              className="w-full rounded-2xl bg-accent py-3 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? "Ukladám…" : "Uložiť"}
            </button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
