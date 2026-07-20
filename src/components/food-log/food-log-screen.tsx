"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { DailyTotals } from "./daily-totals";
import { MealSection } from "./meal-section";
import { AddFoodSheet } from "./add-food-sheet";
import { EditLogSheet } from "./edit-log-sheet";
import { GreetingHeader } from "./greeting-header";
import { HydrationBar } from "./hydration-bar";
import Link from "next/link";
import { CalendarRange, ChevronRight } from "lucide-react";
import { StepsCard } from "./steps-card";
import { MorningCheckin } from "@/components/checkin/morning-checkin";
import { getCached, setCached } from "@/lib/client-cache";
import { MEALS, type DayData, type LogItem, type MealKey } from "./types";

type Weather = { current: { tempC: number; feelsLikeC: number; weatherCode: number } };
type Hydration = { targetMl: number; baseMl: number; heatMl: number; trainingMl: number };

function DnesSkeleton() {
  return (
    <div className="space-y-6 pt-3">
      <div className="skeleton h-12 w-2/3 rounded-xl" />
      <div className="flex flex-col items-center gap-4 pt-2">
        <div className="skeleton h-48 w-48 rounded-full" />
        <div className="grid w-full grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="skeleton h-16 rounded-2xl" />
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-14 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function FoodLogScreen({ name }: { name: string | null }) {
  const reduce = useReducedMotion();

  const range = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const p = (n: number) => String(n).padStart(2, "0");
    const date = `${start.getFullYear()}-${p(start.getMonth() + 1)}-${p(start.getDate())}`;
    return { from: start.toISOString(), to: end.toISOString(), date };
  }, []);

  const dayKey = `day:${range.date}`;
  const wxKey = `wx:${range.date}`;

  const [data, setData] = useState<DayData | null>(() => getCached<DayData>(dayKey) ?? null);
  const [weather, setWeather] = useState<Weather | null>(
    () => getCached<{ weather: Weather; hydration: Hydration }>(wxKey)?.weather ?? null,
  );
  const [hydration, setHydration] = useState<Hydration | null>(
    () => getCached<{ weather: Weather; hydration: Hydration }>(wxKey)?.hydration ?? null,
  );
  const [loading, setLoading] = useState(() => !getCached<DayData>(dayKey));
  const [addMeal, setAddMeal] = useState<MealKey | null>(null);
  const [editItem, setEditItem] = useState<LogItem | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/logs?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}&date=${range.date}`,
    );
    if (res.ok) {
      const d = (await res.json()) as DayData;
      setData(d);
      setCached(dayKey, d);
    }
    setLoading(false);
  }, [range, dayKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/weather?date=${range.date}`);
      if (res.ok) {
        const d = await res.json();
        setWeather(d.weather);
        setHydration(d.hydration);
        setCached(wxKey, { weather: d.weather, hydration: d.hydration });
      }
    })();
  }, [range.date, wxKey]);

  async function saveEdit(id: string, patch: { portionG: number; mealType: MealKey }) {
    await fetch(`/api/logs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load();
  }

  async function deleteItem(id: string) {
    await fetch(`/api/logs/${id}`, { method: "DELETE" });
    await load();
  }

  if (loading || !data) return <DnesSkeleton />;

  const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.025 } } };
  const fade: Variants = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <motion.div
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
      className="space-y-6 pb-4 pt-3"
    >
      <motion.div variants={fade}>
        <GreetingHeader name={name} weather={weather?.current ?? null} />
      </motion.div>

      <motion.div variants={fade}>
        <DailyTotals totals={data.totals} targets={data.targets} />
      </motion.div>

      {hydration && (
        <motion.div variants={fade}>
          <HydrationBar hydration={hydration} />
        </motion.div>
      )}

      <motion.div variants={fade}>
        <StepsCard />
      </motion.div>

      <motion.div variants={fade}>
        <Link href="/tyzden" className="card flex items-center gap-3 p-4 transition active:scale-[0.99]">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-3 text-accent">
            <CalendarRange className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-fg">Týždenný plán</p>
            <p className="text-xs text-muted">Záťaž týždňa, swap aktivít, varovania pred pretrénovaním</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
        </Link>
      </motion.div>

      <motion.div variants={fade} className="space-y-3">
        {MEALS.map((m) => (
          <MealSection
            key={m.key}
            label={m.label}
            mealKey={m.key}
            items={data.items.filter((i) => i.mealType === m.key)}
            onAdd={setAddMeal}
            onEdit={setEditItem}
          />
        ))}
      </motion.div>

      {addMeal && (
        <AddFoodSheet
          meal={addMeal}
          recent={data.recent}
          onClose={() => setAddMeal(null)}
          onAdded={load}
        />
      )}

      {editItem && (
        <EditLogSheet
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={async (id, patch) => {
            await saveEdit(id, patch);
            setEditItem(null);
          }}
          onDelete={async (id) => {
            await deleteItem(id);
            setEditItem(null);
          }}
        />
      )}

      <MorningCheckin />
    </motion.div>
  );
}
