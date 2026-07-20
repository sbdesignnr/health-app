"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Plus, Trash2, Download, Clock, Euro, UtensilsCrossed } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";

type Ingredient = { name: string; grams: number; shop?: string };
type Favorite = {
  id: string;
  name: string;
  mealTypes: string[];
  ingredients: Ingredient[] | null;
  recipe: string[] | null;
  portionG: number | null;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  prepMinutes: number | null;
  priceEur: number | null;
  maxPerWeek: number | null;
  note: string | null;
  active: boolean;
};

const MEAL_TYPES: { key: string; label: string }[] = [
  { key: "BREAKFAST", label: "Raňajky" },
  { key: "SNACK", label: "Desiata" },
  { key: "LUNCH", label: "Obed" },
  { key: "DINNER", label: "Večera" },
];
const MT_LABEL: Record<string, string> = Object.fromEntries(MEAL_TYPES.map((m) => [m.key, m.label]));

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.025 } } };
const fade: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
};

const inp =
  "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none transition placeholder:text-muted/70 focus:border-accent";

const EMPTY: Omit<Favorite, "id"> = {
  name: "",
  mealTypes: [],
  ingredients: null,
  recipe: null,
  portionG: null,
  caloriesKcal: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  prepMinutes: null,
  priceEur: null,
  maxPerWeek: null,
  note: null,
  active: true,
};

export function FavoritesScreen() {
  const reduce = useReducedMotion();
  const [items, setItems] = useState<Favorite[]>([]);
  const [rules, setRules] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<Favorite | Omit<Favorite, "id"> | null>(null);
  const [savedRules, setSavedRules] = useState(false);

  async function load() {
    const [fRes, pRes] = await Promise.all([fetch("/api/favorites"), fetch("/api/profile")]);
    if (fRes.ok) setItems((await fRes.json()).favorites ?? []);
    if (pRes.ok) setRules((await pRes.json()).profile?.foodRules ?? "");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function importDefaults() {
    setBusy(true);
    try {
      const res = await fetch("/api/favorites/import", { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setItems(d.favorites ?? []);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveRules() {
    setBusy(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodRules: rules }),
      });
      setSavedRules(true);
      setTimeout(() => setSavedRules(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(item: Favorite | Omit<Favorite, "id">) {
    setBusy(true);
    try {
      const isEdit = "id" in item;
      const res = await fetch(isEdit ? `/api/favorites/${item.id}` : "/api/favorites", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        setEdit(null);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/favorites/${id}`, { method: "DELETE" });
      setEdit(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-20 rounded-card" />
        ))}
      </div>
    );
  }

  return (
    <motion.div className="space-y-4 pb-4" variants={container} initial={reduce ? false : "hidden"} animate="show">
      {items.length === 0 && (
        <motion.div variants={fade} className="card space-y-3 p-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 ring-1 ring-inset ring-accent/20">
            <UtensilsCrossed className="h-7 w-7 text-accent" strokeWidth={1.5} />
          </div>
          <p className="font-semibold text-white">Zatiaľ žiadne jedlá</p>
          <p className="mx-auto max-w-[34ch] text-sm leading-relaxed text-muted">
            AI zostavuje jedálniček výhradne z týchto jedál. Naimportuj si štartovací zoznam a potom si ho uprav.
          </p>
          <button
            onClick={importDefaults}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-card bg-accent py-3.5 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
          >
            <Download className="h-4 w-4" strokeWidth={2} />
            {busy ? "Importujem…" : "Importovať moje jedlá"}
          </button>
        </motion.div>
      )}

      {items.map((f) => (
        <motion.button
          key={f.id}
          variants={fade}
          onClick={() => setEdit(f)}
          className={`card w-full p-4 text-left transition active:scale-[0.99] ${f.active ? "" : "opacity-50"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 font-semibold leading-snug text-white">{f.name}</p>
            <span className="shrink-0 text-sm font-bold tabular-nums text-white">
              {Math.round(f.caloriesKcal)}
              <span className="ml-0.5 text-[11px] font-normal text-muted">kcal</span>
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            B{Math.round(f.proteinG)}/S{Math.round(f.carbsG)}/T{Math.round(f.fatG)}
            {f.portionG ? ` · ${Math.round(f.portionG)} g` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
            {f.mealTypes.map((m) => (
              <span key={m} className="rounded-full bg-surface-3 px-2 py-0.5 text-accent">
                {MT_LABEL[m] ?? m}
              </span>
            ))}
            {f.prepMinutes != null && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {f.prepMinutes} min
              </span>
            )}
            {f.priceEur != null && (
              <span className="flex items-center gap-1">
                <Euro className="h-3 w-3" /> {f.priceEur}
              </span>
            )}
            {f.maxPerWeek != null && <span className="text-warn">max {f.maxPerWeek}×/týž.</span>}
          </div>
        </motion.button>
      ))}

      <motion.button
        variants={fade}
        onClick={() => setEdit({ ...EMPTY })}
        className="flex w-full items-center justify-center gap-2 rounded-card border border-border bg-surface-2/60 py-3.5 text-sm font-medium transition active:scale-[0.99]"
      >
        <Plus className="h-4 w-4" strokeWidth={2.4} /> Pridať jedlo
      </motion.button>

      {/* pravidlá nákupu a rotácie */}
      <motion.div variants={fade} className="card space-y-3 p-5">
        <div>
          <h2 className="font-semibold text-white">Pravidlá nákupu a rotácie</h2>
          <p className="text-xs text-muted">Obchody, rozpočet, zakázané jedlá, cheat meal — AI to prísne dodrží</p>
        </div>
        <textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          rows={7}
          placeholder="napr. Lidl (základ), Kaufland (steak, losos), Yeme (med, vajcia, čokoláda 85 %)…"
          className={`${inp} resize-none text-sm`}
        />
        <button
          onClick={saveRules}
          disabled={busy}
          className={`w-full rounded-card py-3 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-60 ${
            savedRules ? "bg-accent/10 text-accent ring-1 ring-inset ring-accent/20" : "bg-accent text-accent-fg"
          }`}
        >
          {savedRules ? "Uložené ✓" : "Uložiť pravidlá"}
        </button>
      </motion.div>

      {edit && (
        <FavoriteSheet
          item={edit}
          busy={busy}
          onClose={() => setEdit(null)}
          onSave={saveItem}
          onDelete={removeItem}
        />
      )}
    </motion.div>
  );
}

function FavoriteSheet({
  item,
  busy,
  onClose,
  onSave,
  onDelete,
}: {
  item: Favorite | Omit<Favorite, "id">;
  busy: boolean;
  onClose: () => void;
  onSave: (i: Favorite | Omit<Favorite, "id">) => void;
  onDelete: (id: string) => void;
}) {
  const [d, setD] = useState(item);
  const isEdit = "id" in item;
  const num = (v: string) => (v === "" ? null : Number(v));

  return (
    <Sheet open onClose={onClose} title={isEdit ? "Upraviť jedlo" : "Pridať jedlo"}>
      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="label-caps">Názov</span>
          <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className={inp} />
        </label>

        <div>
          <p className="label-caps mb-2">Vhodné na</p>
          <div className="flex flex-wrap gap-1.5">
            {MEAL_TYPES.map((m) => {
              const on = d.mealTypes.includes(m.key);
              return (
                <button
                  key={m.key}
                  onClick={() =>
                    setD({
                      ...d,
                      mealTypes: on ? d.mealTypes.filter((x) => x !== m.key) : [...d.mealTypes, m.key],
                    })
                  }
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-95 ${
                    on ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted ring-1 ring-inset ring-border"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {(
            [
              ["kcal", "caloriesKcal"],
              ["B (g)", "proteinG"],
              ["S (g)", "carbsG"],
              ["T (g)", "fatG"],
            ] as const
          ).map(([label, key]) => (
            <label key={key} className="block space-y-1.5">
              <span className="label-caps">{label}</span>
              <input
                inputMode="numeric"
                value={String(d[key] ?? "")}
                onChange={(e) => setD({ ...d, [key]: Number(e.target.value) || 0 })}
                className={`${inp} px-2 text-center`}
              />
            </label>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="block space-y-1.5">
            <span className="label-caps">Porcia (g)</span>
            <input
              inputMode="numeric"
              value={String(d.portionG ?? "")}
              onChange={(e) => setD({ ...d, portionG: num(e.target.value) })}
              className={`${inp} px-2 text-center`}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="label-caps">Čas (min)</span>
            <input
              inputMode="numeric"
              value={String(d.prepMinutes ?? "")}
              onChange={(e) => setD({ ...d, prepMinutes: num(e.target.value) })}
              className={`${inp} px-2 text-center`}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="label-caps">Cena (€)</span>
            <input
              inputMode="decimal"
              value={String(d.priceEur ?? "")}
              onChange={(e) => setD({ ...d, priceEur: num(e.target.value) })}
              className={`${inp} px-2 text-center`}
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="label-caps">Max za týždeň (voliteľné)</span>
          <input
            inputMode="numeric"
            value={String(d.maxPerWeek ?? "")}
            onChange={(e) => setD({ ...d, maxPerWeek: num(e.target.value) })}
            placeholder="napr. 1 pri ťažkých jedlách"
            className={inp}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="label-caps">Poznámka</span>
          <input
            value={d.note ?? ""}
            onChange={(e) => setD({ ...d, note: e.target.value || null })}
            className={inp}
          />
        </label>

        <button
          onClick={() => onSave(d)}
          disabled={busy || !d.name.trim()}
          className="w-full rounded-card bg-accent py-3.5 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? "Ukladám…" : "Uložiť"}
        </button>

        {isEdit && (
          <button
            onClick={() => onDelete((d as Favorite).id)}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-card border border-error/40 bg-error/10 py-3 text-sm font-semibold text-error transition active:scale-[0.99] disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} /> Zmazať jedlo
          </button>
        )}
      </div>
    </Sheet>
  );
}
