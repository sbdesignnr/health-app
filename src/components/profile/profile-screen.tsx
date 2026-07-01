"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type GoalType = "LOSE_FAT" | "GAIN_MUSCLE" | "MAINTAIN_PERFORMANCE" | "CUSTOM";
type Activity = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";
type Sex = "MALE" | "FEMALE";

type Breakdown = {
  complete: boolean;
  missing: string[];
  bmr: number | null;
  baselineTdee: number | null;
  trainingKcal: number;
  tdee: number | null;
  goalType: GoalType;
  adjustmentPct: number;
  targets: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number; isDefault: boolean };
};

const inp =
  "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-fg outline-none transition focus:border-accent";

const ACTIVITY_OPTS: { key: Activity; label: string }[] = [
  { key: "SEDENTARY", label: "Sedavý" },
  { key: "LIGHT", label: "Ľahká" },
  { key: "MODERATE", label: "Stredná" },
  { key: "ACTIVE", label: "Aktívny" },
  { key: "VERY_ACTIVE", label: "Veľmi aktívny" },
];

const GOAL_OPTS: { key: GoalType; label: string }[] = [
  { key: "LOSE_FAT", label: "Chudnutie" },
  { key: "MAINTAIN_PERFORMANCE", label: "Udržanie + výkon" },
  { key: "GAIN_MUSCLE", label: "Naberanie" },
];

const DIET_OPTS: { key: string; label: string }[] = [
  { key: "omnivore", label: "Všežravec" },
  { key: "vegetarian", label: "Vegetarián" },
  { key: "vegan", label: "Vegán" },
  { key: "pescatarian", label: "Pescatarián" },
];

function pct(p: number): string {
  const v = Math.round(p * 100);
  return `${v > 0 ? "+" : ""}${v} %`;
}

function splitTags(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold" : "text-muted"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function BreakdownCard({ breakdown }: { breakdown: Breakdown | null }) {
  const t = breakdown?.targets;
  const computed = breakdown?.complete && t && !t.isDefault;

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Tvoj denný cieľ</h2>
        {computed ? (
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">vypočítané</span>
        ) : (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">predvolené</span>
        )}
      </div>

      {t && (
        <>
          <div className="mt-3 text-3xl font-semibold tabular-nums">
            {t.caloriesKcal}
            <span className="ml-1 text-sm font-normal text-muted">kcal</span>
          </div>
          <div className="mt-1 flex gap-3 text-xs text-muted">
            <span>
              <span className="text-protein">{t.proteinG} g</span> biel.
            </span>
            <span>
              <span className="text-carbs">{t.carbsG} g</span> sach.
            </span>
            <span>
              <span className="text-fat">{t.fatG} g</span> tuky
            </span>
          </div>
        </>
      )}

      {breakdown?.complete ? (
        <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
          <Row label="BMR (Mifflin–St Jeor)" value={`${breakdown.bmr} kcal`} />
          <Row label="+ denná aktivita (NEAT)" value={`${breakdown.baselineTdee} kcal`} />
          <Row label="+ tréningy (dnes)" value={`${breakdown.trainingKcal} kcal`} />
          <Row label="= TDEE" value={`${breakdown.tdee} kcal`} strong />
          <Row label={`cieľ (${pct(breakdown.adjustmentPct)})`} value={`${breakdown.targets.caloriesKcal} kcal`} strong />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Doplň {breakdown?.missing.join(", ") || "telesné údaje"}
          {breakdown?.missing.includes("váha") ? " (váhu zapíšeš v Progrese)" : ""} pre reálny výpočet.
          Zatiaľ ukazujeme predvolený cieľ.
        </p>
      )}
    </div>
  );
}

export function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);

  const [heightCm, setHeightCm] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<Sex | "">("");
  const [activity, setActivity] = useState<Activity>("MODERATE");
  const [goal, setGoal] = useState<GoalType>("MAINTAIN_PERFORMANCE");
  const [dietType, setDietType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [dislikes, setDislikes] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        const p = data.profile;
        if (p) {
          setHeightCm(p.heightCm != null ? String(p.heightCm) : "");
          setBirthDate(p.birthDate ?? "");
          setSex(p.sex ?? "");
          setActivity((p.activityLevel as Activity) ?? "MODERATE");
          setDietType(p.dietType ?? "");
          setAllergies(Array.isArray(p.allergies) ? p.allergies.join(", ") : "");
          setDislikes(Array.isArray(p.dislikes) ? p.dislikes.join(", ") : "");
        }
        setGoal((data.goalType as GoalType) ?? "MAINTAIN_PERFORMANCE");
        setBreakdown(data.breakdown ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heightCm: heightCm ? Number(heightCm) : undefined,
          birthDate: birthDate || undefined,
          sex: sex || undefined,
          activityLevel: activity,
          goalType: goal,
          dietType: dietType || null,
          allergies: splitTags(allergies),
          dislikes: splitTags(dislikes),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Uloženie zlyhalo.");
      const data = await res.json();
      setBreakdown(data.breakdown);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-card border border-border bg-surface" />;
  }

  return (
    <div className="space-y-5">
      <BreakdownCard breakdown={breakdown} />

      <Link
        href="/rozvrh"
        className="flex items-center justify-between rounded-card border border-border bg-surface p-4 transition active:scale-[0.99]"
      >
        <div>
          <p className="font-medium">Rozvrh tréningov</p>
          <p className="text-xs text-muted">Futbal, posilňovňa, zápasy → výdaj do TDEE</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted" />
      </Link>

      <Link
        href="/restauracie"
        className="flex items-center justify-between rounded-card border border-border bg-surface p-4 transition active:scale-[0.99]"
      >
        <div>
          <p className="font-medium">Reštaurácie v Nitre</p>
          <p className="text-xs text-muted">Obedové menu → návrhy obeda v AI jedálničku</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted" />
      </Link>

      <div className="space-y-4 rounded-card border border-border bg-surface p-5">
        <h2 className="font-medium">Telesné údaje</h2>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Výška (cm)">
            <input inputMode="numeric" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className={inp} />
          </Field>
          <Field label="Dátum narodenia">
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inp} />
          </Field>
        </div>

        <Field label="Pohlavie">
          <div className="flex gap-2">
            {(["MALE", "FEMALE"] as Sex[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSex(s)}
                className={`flex-1 rounded-2xl py-3 text-sm font-medium transition ${
                  sex === s ? "bg-accent text-accent-fg" : "border border-border bg-surface-2 text-muted"
                }`}
              >
                {s === "MALE" ? "Muž" : "Žena"}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Denná aktivita (BEZ tréningov – tie sa rátajú zvlášť)">
          <div className="flex flex-wrap gap-1.5">
            {ACTIVITY_OPTS.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setActivity(a.key)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  activity === a.key ? "bg-accent text-accent-fg" : "border border-border bg-surface-2 text-muted"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Cieľ">
          <div className="flex flex-wrap gap-1.5">
            {GOAL_OPTS.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setGoal(g.key)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  goal === g.key ? "bg-accent text-accent-fg" : "border border-border bg-surface-2 text-muted"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="space-y-4 rounded-card border border-border bg-surface p-5">
        <div>
          <h2 className="font-medium">Strava a preferencie</h2>
          <p className="text-xs text-muted">Vstup pre AI jedálničky (Fáza 5)</p>
        </div>

        <Field label="Typ stravy">
          <div className="flex flex-wrap gap-1.5">
            {DIET_OPTS.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDietType(dietType === d.key ? "" : d.key)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  dietType === d.key ? "bg-accent text-accent-fg" : "border border-border bg-surface-2 text-muted"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Alergie (oddeľ čiarkou)">
          <input
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="napr. orechy, laktóza"
            className={inp}
          />
        </Field>

        <Field label="Nemám rád/nejem (oddeľ čiarkou)">
          <input
            value={dislikes}
            onChange={(e) => setDislikes(e.target.value)}
            placeholder="napr. huby, olivy"
            className={inp}
          />
        </Field>
      </div>

      {error && <p className="text-sm text-protein">{error}</p>}

      <button
        onClick={save}
        disabled={busy}
        className="w-full rounded-2xl bg-accent py-3 font-semibold text-accent-fg transition active:scale-[0.99] disabled:opacity-60"
      >
        {busy ? "Ukladám…" : saved ? "Uložené ✓" : "Uložiť profil"}
      </button>
    </div>
  );
}
