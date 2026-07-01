"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, Plus, Sparkles, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { DAYS } from "@/components/schedule/labels";

type Item = {
  id: string;
  dayOfWeek: number | null;
  name: string;
  description: string | null;
  priceEur: number | null;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  macrosSource: string;
};
type Restaurant = { id: string; name: string; address: string | null; items: Item[] };

const inp =
  "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none transition focus:border-accent";

async function resizeImage(file: File): Promise<{ base64: string; mediaType: "image/jpeg" }> {
  const img = await createImageBitmap(file);
  const max = 1280;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Nepodarilo sa spracovať obrázok.");
  ctx.drawImage(img, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  return { base64: dataUrl.split(",")[1], mediaType: "image/jpeg" };
}

function MenuItemSheet({
  restaurantId,
  item,
  onClose,
  onSaved,
}: {
  restaurantId: string;
  item?: Item;
  onClose: () => void;
  onSaved: (r: Restaurant) => void;
}) {
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(item?.dayOfWeek ?? null);
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [priceEur, setPriceEur] = useState(item?.priceEur != null ? String(item.priceEur) : "");
  const [kcal, setKcal] = useState(item?.caloriesKcal != null ? String(item.caloriesKcal) : "");
  const [p, setP] = useState(item?.proteinG != null ? String(item.proteinG) : "");
  const [c, setC] = useState(item?.carbsG != null ? String(item.carbsG) : "");
  const [f, setF] = useState(item?.fatG != null ? String(item.fatG) : "");
  const [source, setSource] = useState(item?.macrosSource ?? "MANUAL");
  const [busy, setBusy] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState("");

  async function estimate() {
    if (!name.trim()) {
      setError("Najprv zadaj názov.");
      return;
    }
    setEstimating(true);
    setError("");
    try {
      const res = await fetch("/api/menu/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Odhad zlyhal.");
      const { macros } = await res.json();
      setKcal(String(macros.caloriesKcal));
      setP(String(macros.proteinG));
      setC(String(macros.carbsG));
      setF(String(macros.fatG));
      setSource("AI_ESTIMATED");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setEstimating(false);
    }
  }

  async function submit(method: "POST" | "PATCH" | "DELETE") {
    setBusy(true);
    setError("");
    try {
      const url = item
        ? `/api/restaurants/${restaurantId}/menu/${item.id}`
        : `/api/restaurants/${restaurantId}/menu`;
      const res = await fetch(url, {
        method,
        headers: method === "DELETE" ? undefined : { "Content-Type": "application/json" },
        body:
          method === "DELETE"
            ? undefined
            : JSON.stringify({
                dayOfWeek,
                name,
                description: description || null,
                priceEur: priceEur ? Number(priceEur) : null,
                caloriesKcal: kcal ? Number(kcal) : null,
                proteinG: p ? Number(p) : null,
                carbsG: c ? Number(c) : null,
                fatG: f ? Number(f) : null,
                macrosSource: source,
              }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Chyba.");
      onSaved((await res.json()).restaurant);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
      setBusy(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title={item ? "Upraviť položku" : "Pridať položku"}>
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-xs text-muted">Deň</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setDayOfWeek(null)}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                dayOfWeek === null ? "bg-accent text-accent-fg" : "border border-border bg-surface-2 text-muted"
              }`}
            >
              Celý týždeň
            </button>
            {DAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDayOfWeek(d.value)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  dayOfWeek === d.value ? "bg-accent text-accent-fg" : "border border-border bg-surface-2 text-muted"
                }`}
              >
                {d.short}
              </button>
            ))}
          </div>
        </div>

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Názov jedla" className={inp} />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Popis (voliteľné)"
          className={inp}
        />
        <input
          value={priceEur}
          onChange={(e) => setPriceEur(e.target.value)}
          inputMode="decimal"
          placeholder="Cena € (voliteľné)"
          className={inp}
        />

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted">Makrá (porcia)</p>
          <button
            type="button"
            onClick={estimate}
            disabled={estimating}
            className="flex items-center gap-1.5 rounded-full bg-carbs/15 px-3 py-1 text-xs font-medium text-carbs transition active:scale-95 disabled:opacity-60"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {estimating ? "Odhadujem…" : "AI odhad"}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <input value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="numeric" placeholder="kcal" className={inp + " px-2 text-center"} />
          <input value={p} onChange={(e) => setP(e.target.value)} inputMode="numeric" placeholder="B" className={inp + " px-2 text-center"} />
          <input value={c} onChange={(e) => setC(e.target.value)} inputMode="numeric" placeholder="S" className={inp + " px-2 text-center"} />
          <input value={f} onChange={(e) => setF(e.target.value)} inputMode="numeric" placeholder="T" className={inp + " px-2 text-center"} />
        </div>
        {source === "AI_ESTIMATED" && <p className="text-xs text-carbs/90">Makrá označené ako AI odhad.</p>}

        {error && <p className="text-sm text-protein">{error}</p>}

        <button
          onClick={() => submit(item ? "PATCH" : "POST")}
          disabled={busy || !name.trim()}
          className="w-full rounded-2xl bg-accent py-3 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? "Ukladám…" : "Uložiť"}
        </button>
        {item && (
          <button
            onClick={() => submit("DELETE")}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-protein/40 bg-protein/10 py-3 text-sm font-semibold text-protein transition active:scale-[0.99] disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Zmazať položku
          </button>
        )}
      </div>
    </Sheet>
  );
}

export function RestaurantDetail({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const [r, setR] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch(`/api/restaurants/${restaurantId}`);
    if (res.ok) setR((await res.json()).restaurant);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [restaurantId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    setError("");
    try {
      const { base64, mediaType } = await resizeImage(file);
      const res = await fetch(`/api/restaurants/${restaurantId}/photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Prepis zlyhal.");
      setR((await res.json()).restaurant);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba.");
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-card border border-border bg-surface" />;
  }
  if (!r) return <p className="text-sm text-muted">Reštaurácia sa nenašla.</p>;

  const groups = [
    ...DAYS.map((d) => ({ label: d.label, items: r.items.filter((i) => i.dayOfWeek === d.value) })),
    { label: "Celý týždeň", items: r.items.filter((i) => i.dayOfWeek == null) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-border bg-surface p-4">
        <p className="font-medium">{r.name}</p>
        {r.address && <p className="text-xs text-muted">{r.address}</p>}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={photoBusy}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-surface-2 py-3 text-sm font-medium transition active:scale-[0.99] disabled:opacity-60"
        >
          <Camera className="h-4 w-4" />
          {photoBusy ? "Prepisujem…" : "Odfotiť menu"}
        </button>
        <button
          onClick={() => setAdding(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-semibold text-accent-fg transition active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" />
          Položka
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" />
      {photoBusy && <p className="text-xs text-muted">AI prepisuje fotku menu a odhaduje makrá… (nahradí súčasné menu)</p>}
      {error && <p className="text-sm text-protein">{error}</p>}

      {groups.length === 0 ? (
        <p className="rounded-card border border-border bg-surface p-4 text-sm text-muted">
          Žiadne položky menu. Odfoť cedulu alebo pridaj jedlo ručne.
        </p>
      ) : (
        groups.map((g) => (
          <div key={g.label}>
            <p className="mb-1.5 px-1 text-xs font-medium text-muted">{g.label}</p>
            <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
              {g.items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setEditItem(it)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition active:bg-surface-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{it.name}</p>
                    <p className="truncate text-xs text-muted">
                      {it.caloriesKcal != null
                        ? `${Math.round(it.caloriesKcal)} kcal · B${Math.round(it.proteinG ?? 0)}/S${Math.round(it.carbsG ?? 0)}/T${Math.round(it.fatG ?? 0)}`
                        : "bez makier"}
                      {it.priceEur ? ` · ${it.priceEur} €` : ""}
                    </p>
                  </div>
                  {it.macrosSource === "AI_ESTIMATED" && (
                    <span className="shrink-0 rounded-full bg-carbs/15 px-2 py-0.5 text-[10px] font-medium text-carbs">
                      AI odhad
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {!confirmDel ? (
        <button
          onClick={() => setConfirmDel(true)}
          className="w-full rounded-2xl border border-border bg-surface-2 py-3 text-sm font-medium text-muted transition active:scale-[0.99]"
        >
          Zmazať reštauráciu
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setConfirmDel(false)}
            className="flex-1 rounded-2xl border border-border bg-surface-2 py-3 text-sm font-medium transition active:scale-[0.99]"
          >
            Zrušiť
          </button>
          <button
            onClick={async () => {
              await fetch(`/api/restaurants/${restaurantId}`, { method: "DELETE" });
              router.push("/restauracie");
            }}
            className="flex-1 rounded-2xl bg-protein py-3 text-sm font-semibold text-bg transition active:scale-[0.99]"
          >
            Naozaj zmazať
          </button>
        </div>
      )}

      {(adding || editItem) && (
        <MenuItemSheet
          restaurantId={restaurantId}
          item={editItem ?? undefined}
          onClose={() => {
            setAdding(false);
            setEditItem(null);
          }}
          onSaved={(rest) => {
            setR(rest);
            setAdding(false);
            setEditItem(null);
          }}
        />
      )}
    </div>
  );
}
