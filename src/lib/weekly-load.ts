import { prisma } from "./prisma";

export type LoadColor = "red" | "orange" | "green" | "grey";

export type WeekActivity = {
  eventId: string;
  type: string;
  title: string | null;
  startTime: string | null;
  minutes: number;
  rpe: number;
  load: number;
  isRecurring: boolean;
};

export type WeekDay = {
  date: string; // YYYY-MM-DD
  dayName: string;
  activities: WeekActivity[];
  dayLoad: number;
  color: LoadColor;
};

export type WeekLoad = {
  weekStart: string;
  days: WeekDay[];
  totalLoad: number;
  warnings: string[];
};

export const SK_DAY_NAMES = ["Nedeľa", "Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota"];

export const TYPE_LABEL_SK: Record<string, string> = {
  FOOTBALL_TRAINING: "Futbal tréning",
  GYM: "Posilňovňa",
  MATCH: "Zápas",
  REST: "Voľno",
  ACTIVE_RECOVERY: "Aktívna regenerácia",
  TENNIS: "Tenis",
  SWIMMING: "Plávanie",
  RUNNING: "Beh",
  CUSTOM: "Vlastné",
};

// Predvolené RPE (1–10) a trvanie, ak používateľ nezadal.
const DEFAULT_RPE: Record<string, number> = {
  MATCH: 9,
  FOOTBALL_TRAINING: 6,
  GYM: 7,
  RUNNING: 6,
  TENNIS: 5,
  SWIMMING: 4,
  ACTIVE_RECOVERY: 2,
  REST: 0,
  CUSTOM: 5,
};
const DEFAULT_MIN: Record<string, number> = {
  MATCH: 90,
  FOOTBALL_TRAINING: 90,
  GYM: 60,
  RUNNING: 40,
  TENNIS: 60,
  SWIMMING: 40,
  ACTIVE_RECOVERY: 30,
  REST: 0,
  CUSTOM: 45,
};

// Prahy týždennej záťaže (Σ RPE × minúty) pre poloprofesionálneho futbalistu.
const LOAD_LOW = 1200;
const LOAD_HIGH = 3500;

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Pondelok týždňa, v ktorom leží dátum.
export function weekStartOf(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0=Ne
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(dateStr, diff);
}

function colorFor(activities: WeekActivity[]): LoadColor {
  if (activities.length === 0) return "grey";
  const maxRpe = Math.max(...activities.map((a) => a.rpe));
  if (maxRpe >= 8) return "red";
  if (maxRpe >= 5) return "orange";
  if (maxRpe > 0) return "green";
  return "grey";
}

export async function getWeekLoad(userId: string, anyDateInWeek: string): Promise<WeekLoad> {
  const weekStart = weekStartOf(anyDateInWeek);
  const events = await prisma.scheduleEvent.findMany({ where: { userId } });

  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay();

    const matching = events.filter((e) => {
      if (e.isRecurring) return e.dayOfWeek === dow;
      return e.date ? e.date.toISOString().slice(0, 10) === date : false;
    });

    const activities: WeekActivity[] = matching.map((e) => {
      const minutes = e.durationMin ?? DEFAULT_MIN[e.type] ?? 45;
      const rpe = e.rpe ?? DEFAULT_RPE[e.type] ?? 5;
      return {
        eventId: e.id,
        type: e.type,
        title: e.title,
        startTime: e.startTime,
        minutes,
        rpe,
        load: rpe * minutes,
        isRecurring: e.isRecurring,
      };
    });

    const dayLoad = activities.reduce((a, x) => a + x.load, 0);
    days.push({ date, dayName: SK_DAY_NAMES[dow], activities, dayLoad, color: colorFor(activities) });
  }

  const totalLoad = days.reduce((a, d) => a + d.dayLoad, 0);
  const warnings: string[] = [];

  // 1) 4+ vysokointenzívne dni po sebe bez voľna
  let streak = 0;
  for (const d of days) {
    const hard = d.activities.some((a) => a.rpe >= 7);
    streak = hard ? streak + 1 : 0;
    if (streak >= 4) {
      warnings.push("4 a viac náročných dní po sebe bez voľna – zaraď deň odpočinku alebo aktívnej regenerácie.");
      break;
    }
  }

  // 2) Deň po zápase musí byť regenerácia/voľno
  for (let i = 0; i < days.length - 1; i++) {
    if (days[i].activities.some((a) => a.type === "MATCH")) {
      const next = days[i + 1];
      const hardNext = next.activities.some((a) => a.type === "GYM" || a.type === "FOOTBALL_TRAINING");
      if (hardNext) {
        warnings.push(
          `Deň po zápase (${next.dayName}) máš gym/futbal – po zápase patrí aktívna regenerácia alebo voľno.`,
        );
      }
    }
  }

  // 3) Ťažká posilňovňa 2 dni pred zápasom
  for (let i = 0; i < days.length; i++) {
    if (!days[i].activities.some((a) => a.type === "MATCH")) continue;
    for (let back = 1; back <= 2; back++) {
      const d = days[i - back];
      if (d && d.activities.some((a) => a.type === "GYM" && a.rpe >= 7)) {
        warnings.push(
          `${d.dayName}: ťažká posilňovňa ${back} ${back === 1 ? "deň" : "dni"} pred zápasom – zníž na aktiváciu (RPE ≤ 4).`,
        );
      }
    }
  }

  // 4) Celková týždenná záťaž
  if (totalLoad > LOAD_HIGH) {
    warnings.push(
      `Týždenná záťaž ${totalLoad} je vysoká (nad ${LOAD_HIGH}) – riziko pretrénovania. Zníž objem alebo pridaj voľno.`,
    );
  } else if (totalLoad > 0 && totalLoad < LOAD_LOW) {
    warnings.push(`Týždenná záťaž ${totalLoad} je nízka (pod ${LOAD_LOW}) – priestor pridať tréning.`);
  }

  return { weekStart, days, totalLoad, warnings };
}

// Textové zhrnutie týždňa pre AI prompt.
export function weekSummaryForAi(week: WeekLoad): string {
  const lines: string[] = [];
  lines.push(`TÝŽDENNÁ ZÁŤAŽ (Σ RPE × min): ${week.totalLoad}`);
  for (const d of week.days) {
    const acts =
      d.activities.length === 0
        ? "voľno"
        : d.activities
            .map((a) => `${TYPE_LABEL_SK[a.type] ?? a.type} ${a.minutes} min @RPE ${a.rpe}`)
            .join(", ");
    lines.push(`- ${d.dayName} ${d.date}: ${acts} (load ${d.dayLoad})`);
  }
  if (week.warnings.length > 0) {
    lines.push("VAROVANIA:");
    for (const w of week.warnings) lines.push(`- ${w}`);
  }
  return lines.join("\n");
}
