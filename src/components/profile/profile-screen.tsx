"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { ChevronRight, Dumbbell, MapPin, Check, CalendarDays, Goal } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";

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
  "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3.5 text-fg outline-none transition placeholder:text-muted/70 focus:border-accent";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const fade: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

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

const CONCERN_OPTS = [
  "Akné / vyrážky",
  "Vypadávanie vlasov",
  "Tráviace problémy",
  "Zlý spánok",
  "Stres / úzkosť",
  "Nízka energia",
  "Bolesti kĺbov",
  "Slabá imunita",
];

const EXPERIENCE_OPTS = ["Začiatočník", "Stredne pokročilý", "Pokročilý"];
const FOOT_OPTS: { key: string; label: string }[] = [
  { key: "left", label: "Ľavá" },
  { key: "right", label: "Pravá" },
  { key: "both", label: "Obojnohý" },
];

function pct(p: number): string {
  const v = Math.round(p * 100);
  return `${v > 0 ? "+" : ""}${v} %`;
}

function pillCls(active: boolean): string {
  return `rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-95 ${
    active ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted ring-1 ring-inset ring-border"
  }`;
}

function splitTags(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="label-caps">{label}</span>
      {children}
    </label>
  );
}

function LevelPicker({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-10 flex-1 rounded-xl text-sm font-semibold tabular-nums transition active:scale-95 ${
            value === n ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted ring-1 ring-inset ring-border"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold text-white" : "text-muted"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function MacroDot({ color, value, label }: { color: string; value: number; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="tabular-nums text-fg">{value} g</span>
      <span className="text-muted">{label}</span>
    </span>
  );
}

function BreakdownCard({ breakdown }: { breakdown: Breakdown | null }) {
  const t = breakdown?.targets;
  const computed = breakdown?.complete && t && !t.isDefault;

  return (
    <div className="card relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative flex items-center justify-between">
        <p className="label-caps">Tvoj denný cieľ</p>
        {computed ? (
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent ring-1 ring-inset ring-accent/25">
            vypočítané
          </span>
        ) : (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
            predvolené
          </span>
        )}
      </div>

      {t && (
        <>
          <div className="relative mt-2 flex items-baseline gap-1.5">
            <AnimatedNumber
              value={t.caloriesKcal}
              className="text-4xl font-bold tracking-tight text-white tabular-nums"
            />
            <span className="text-sm text-muted">kcal</span>
          </div>
          <div className="relative mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <MacroDot color="var(--color-protein)" value={t.proteinG} label="biel." />
            <MacroDot color="var(--color-carbs)" value={t.carbsG} label="sach." />
            <MacroDot color="var(--color-fat)" value={t.fatG} label="tuky" />
          </div>
        </>
      )}

      {breakdown?.complete ? (
        <div className="relative mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
          <Row label="BMR (Mifflin–St Jeor)" value={`${breakdown.bmr} kcal`} />
          <Row label="+ denná aktivita (NEAT)" value={`${breakdown.baselineTdee} kcal`} />
          <Row label="+ tréningy (dnes)" value={`${breakdown.trainingKcal} kcal`} />
          <Row label="= TDEE" value={`${breakdown.tdee} kcal`} strong />
          <Row label={`cieľ (${pct(breakdown.adjustmentPct)})`} value={`${breakdown.targets.caloriesKcal} kcal`} strong />
        </div>
      ) : (
        <p className="relative mt-3 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-muted">
          Doplň {breakdown?.missing.join(", ") || "telesné údaje"}
          {breakdown?.missing.includes("váha") ? " (váhu zapíšeš v Progrese)" : ""} pre reálny výpočet.
          Zatiaľ ukazujeme predvolený cieľ.
        </p>
      )}
    </div>
  );
}

export function ProfileScreen() {
  const reduce = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);

  const [name, setName] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<Sex | "">("");
  const [activity, setActivity] = useState<Activity>("MODERATE");
  const [goal, setGoal] = useState<GoalType>("MAINTAIN_PERFORMANCE");
  const [dietType, setDietType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [dislikes, setDislikes] = useState("");
  const [likes, setLikes] = useState("");
  const [supplements, setSupplements] = useState("");
  const [healthConcerns, setHealthConcerns] = useState<string[]>([]);
  const [healthNotes, setHealthNotes] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [sleepTime, setSleepTime] = useState("");
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [footballLeague, setFootballLeague] = useState("");
  const [footballPosition, setFootballPosition] = useState("");
  const [yearsPlaying, setYearsPlaying] = useState("");
  const [matchMinutes, setMatchMinutes] = useState("");
  const [dominantFoot, setDominantFoot] = useState("");
  const [seasonStartDate, setSeasonStartDate] = useState("");
  const [gymDaysPerWeek, setGymDaysPerWeek] = useState("");
  const [trainingExperience, setTrainingExperience] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        const p = data.profile;
        if (p) {
          setName(p.name ?? "");
          setHeightCm(p.heightCm != null ? String(p.heightCm) : "");
          setBirthDate(p.birthDate ?? "");
          setSex(p.sex ?? "");
          setActivity((p.activityLevel as Activity) ?? "MODERATE");
          setDietType(p.dietType ?? "");
          setAllergies(Array.isArray(p.allergies) ? p.allergies.join(", ") : "");
          setDislikes(Array.isArray(p.dislikes) ? p.dislikes.join(", ") : "");
          setLikes(Array.isArray(p.likes) ? p.likes.join(", ") : "");
          setSupplements(Array.isArray(p.supplements) ? p.supplements.join(", ") : "");
          setHealthConcerns(Array.isArray(p.healthConcerns) ? p.healthConcerns : []);
          setHealthNotes(p.healthNotes ?? "");
          setWakeTime(p.wakeTime ?? "");
          setSleepTime(p.sleepTime ?? "");
          setStressLevel(typeof p.stressLevel === "number" ? p.stressLevel : null);
          setSleepQuality(typeof p.sleepQuality === "number" ? p.sleepQuality : null);
          setFootballLeague(p.footballLeague ?? "");
          setFootballPosition(p.footballPosition ?? "");
          setYearsPlaying(p.yearsPlaying != null ? String(p.yearsPlaying) : "");
          setMatchMinutes(p.matchMinutes != null ? String(p.matchMinutes) : "");
          setDominantFoot(p.dominantFoot ?? "");
          setSeasonStartDate(p.seasonStartDate ?? "");
          setGymDaysPerWeek(p.gymDaysPerWeek != null ? String(p.gymDaysPerWeek) : "");
          setTrainingExperience(p.trainingExperience ?? "");
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
          name: name.trim(),
          heightCm: heightCm ? Number(heightCm) : undefined,
          birthDate: birthDate || undefined,
          sex: sex || undefined,
          activityLevel: activity,
          goalType: goal,
          dietType: dietType || null,
          allergies: splitTags(allergies),
          dislikes: splitTags(dislikes),
          likes: splitTags(likes),
          supplements: splitTags(supplements),
          healthConcerns,
          healthNotes: healthNotes.trim() || null,
          wakeTime: wakeTime || null,
          sleepTime: sleepTime || null,
          stressLevel,
          sleepQuality,
          footballLeague: footballLeague.trim() || null,
          footballPosition: footballPosition.trim() || null,
          yearsPlaying: yearsPlaying ? Number(yearsPlaying) : null,
          matchMinutes: matchMinutes ? Number(matchMinutes) : null,
          dominantFoot: dominantFoot || null,
          seasonStartDate: seasonStartDate || null,
          gymDaysPerWeek: gymDaysPerWeek ? Number(gymDaysPerWeek) : null,
          trainingExperience: trainingExperience || null,
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
    return (
      <div className="space-y-5">
        <div className="card h-40 p-5">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton mt-3 h-9 w-28 rounded" />
        </div>
        <div className="skeleton h-16 rounded-card" />
        <div className="skeleton h-16 rounded-card" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-5"
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
    >
      <motion.div variants={fade}>
        <BreakdownCard breakdown={breakdown} />
      </motion.div>

      <motion.div variants={fade}>
        <Link
          href="/fitness"
          className="card flex items-center gap-3 p-4 transition active:scale-[0.99]"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-3 text-accent">
            <Dumbbell className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-fg">Fitness (gym)</p>
            <p className="text-xs text-muted">AI plán podľa fázy · cviky, série, zápis váh + progres</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
        </Link>
      </motion.div>

      <motion.div variants={fade}>
        <Link
          href="/futbal"
          className="card flex items-center gap-3 p-4 transition active:scale-[0.99]"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-3 text-accent">
            <Goal className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-fg">Futbal</p>
            <p className="text-xs text-muted">AI zameranie spoločných tréningov + individuálny plán</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
        </Link>
      </motion.div>

      <motion.div variants={fade}>
        <Link
          href="/rozvrh"
          className="card flex items-center gap-3 p-4 transition active:scale-[0.99]"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-3 text-accent">
            <CalendarDays className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-fg">Rozvrh tréningov</p>
            <p className="text-xs text-muted">Futbal, posilňovňa, zápasy → výdaj do TDEE</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
        </Link>
      </motion.div>

      <motion.div variants={fade}>
        <Link
          href="/restauracie"
          className="card flex items-center gap-3 p-4 transition active:scale-[0.99]"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-3 text-accent">
            <MapPin className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-fg">Reštaurácie v Nitre</p>
            <p className="text-xs text-muted">Obedové menu → návrhy obeda v AI jedálničku</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
        </Link>
      </motion.div>

      <motion.div variants={fade} className="card space-y-4 p-5">
        <h2 className="font-semibold text-white">Telesné údaje</h2>

        <Field label="Meno">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="napr. Samuel"
            maxLength={60}
            className={inp}
          />
        </Field>

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
                className={`flex-1 rounded-2xl py-3 text-sm font-medium transition active:scale-[0.98] ${
                  sex === s ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted ring-1 ring-inset ring-border"
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
              <button key={a.key} type="button" onClick={() => setActivity(a.key)} className={pillCls(activity === a.key)}>
                {a.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Cieľ">
          <div className="flex flex-wrap gap-1.5">
            {GOAL_OPTS.map((g) => (
              <button key={g.key} type="button" onClick={() => setGoal(g.key)} className={pillCls(goal === g.key)}>
                {g.label}
              </button>
            ))}
          </div>
        </Field>
      </motion.div>

      <motion.div variants={fade} className="card space-y-4 p-5">
        <div>
          <h2 className="font-semibold text-white">Zdravie a životný štýl</h2>
          <p className="text-xs text-muted">Toto AI zohľadní pri jedálničku na mieru</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Čas budenia">
            <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className={inp} />
          </Field>
          <Field label="Čas spánku">
            <input type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} className={inp} />
          </Field>
        </div>

        <Field label="Kvalita spánku (1 = zlá, 5 = výborná)">
          <LevelPicker value={sleepQuality} onChange={setSleepQuality} />
        </Field>

        <Field label="Úroveň stresu (1 = pokoj, 5 = vysoký)">
          <LevelPicker value={stressLevel} onChange={setStressLevel} />
        </Field>

        <Field label="Na čo sa zamerať (zdravie)">
          <div className="flex flex-wrap gap-1.5">
            {CONCERN_OPTS.map((cc) => {
              const active = healthConcerns.includes(cc);
              return (
                <button
                  key={cc}
                  type="button"
                  onClick={() =>
                    setHealthConcerns((s) => (active ? s.filter((x) => x !== cc) : [...s, cc]))
                  }
                  className={pillCls(active)}
                >
                  {cc}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Poznámky (psychika, stav, čokoľvek dôležité)">
          <textarea
            value={healthNotes}
            onChange={(e) => setHealthNotes(e.target.value)}
            rows={3}
            placeholder="napr. posledný týždeň dosť stresu, občas vyrážky na tvári, cez deň málo energie…"
            className={`${inp} resize-none`}
          />
        </Field>

        <Field label="Výživové doplnky, ktoré užívaš (oddeľ čiarkou)">
          <input
            value={supplements}
            onChange={(e) => setSupplements(e.target.value)}
            placeholder="napr. Kreatín, Omega-3, Vitamín D3, Magnézium"
            className={inp}
          />
        </Field>
      </motion.div>

      <motion.div variants={fade} className="card space-y-4 p-5">
        <div>
          <h2 className="font-semibold text-white">Futbal / šport</h2>
          <p className="text-xs text-muted">Vstup pre AI tréningové programy (gym + futbal)</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Liga">
            <input
              value={footballLeague}
              onChange={(e) => setFootballLeague(e.target.value)}
              placeholder="napr. III. liga"
              className={inp}
            />
          </Field>
          <Field label="Post">
            <input
              value={footballPosition}
              onChange={(e) => setFootballPosition(e.target.value)}
              placeholder="napr. stredný obranca"
              className={inp}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Roky hrania">
            <input
              inputMode="numeric"
              value={yearsPlaying}
              onChange={(e) => setYearsPlaying(e.target.value)}
              placeholder="napr. 12"
              className={inp}
            />
          </Field>
          <Field label="Dĺžka zápasu (min)">
            <input
              inputMode="numeric"
              value={matchMinutes}
              onChange={(e) => setMatchMinutes(e.target.value)}
              placeholder="90"
              className={inp}
            />
          </Field>
        </div>

        <Field label="Silná noha">
          <div className="flex gap-2">
            {FOOT_OPTS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setDominantFoot(dominantFoot === f.key ? "" : f.key)}
                className={`flex-1 rounded-2xl py-3 text-sm font-medium transition active:scale-[0.98] ${
                  dominantFoot === f.key ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted ring-1 ring-inset ring-border"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Začiatok sezóny">
            <input
              type="date"
              value={seasonStartDate}
              onChange={(e) => setSeasonStartDate(e.target.value)}
              className={inp}
            />
          </Field>
          <Field label="Gym dní / týždeň">
            <input
              inputMode="numeric"
              value={gymDaysPerWeek}
              onChange={(e) => setGymDaysPerWeek(e.target.value)}
              placeholder="napr. 4"
              className={inp}
            />
          </Field>
        </div>

        <Field label="Skúsenosti v posilňovni">
          <div className="flex flex-wrap gap-1.5">
            {EXPERIENCE_OPTS.map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => setTrainingExperience(trainingExperience === x ? "" : x)}
                className={pillCls(trainingExperience === x)}
              >
                {x}
              </button>
            ))}
          </div>
        </Field>
      </motion.div>

      <motion.div variants={fade} className="card space-y-4 p-5">
        <div>
          <h2 className="font-semibold text-white">Strava a preferencie</h2>
          <p className="text-xs text-muted">Vstup pre AI jedálničky</p>
        </div>

        <Field label="Typ stravy">
          <div className="flex flex-wrap gap-1.5">
            {DIET_OPTS.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDietType(dietType === d.key ? "" : d.key)}
                className={pillCls(dietType === d.key)}
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

        <Field label="Obľúbené jedlá (oddeľ čiarkou)">
          <input
            value={likes}
            onChange={(e) => setLikes(e.target.value)}
            placeholder="napr. kuracie, cestoviny, tvaroh, losos"
            className={inp}
          />
        </Field>
      </motion.div>

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
        onClick={save}
        disabled={busy}
        className={`flex w-full items-center justify-center gap-2 rounded-card py-3.5 font-semibold transition active:scale-[0.99] disabled:opacity-60 ${
          saved ? "bg-accent/10 text-accent ring-1 ring-inset ring-accent/20" : "bg-accent text-accent-fg"
        }`}
      >
        {saved ? (
          <>
            <Check className="h-[18px] w-[18px]" strokeWidth={2.5} /> Uložené
          </>
        ) : busy ? (
          "Ukladám…"
        ) : (
          "Uložiť profil"
        )}
      </motion.button>
    </motion.div>
  );
}
