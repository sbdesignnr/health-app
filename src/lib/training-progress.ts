import { prisma } from "./prisma";

export type ProgressRange = "day" | "week" | "year";

export type Bucket = { label: string; volume: number; sessions: number };
export type ExerciseProgress = {
  name: string;
  sessions: number;
  bestKg: number;
  firstKg: number;
  lastKg: number;
  deltaKg: number;
  lastAt: string;
};
export type ProgressData = {
  range: ProgressRange;
  buckets: Bucket[];
  totalSessions: number;
  totalVolume: number;
  exercises: ExerciseProgress[];
};

const SK_MONTHS = ["jan", "feb", "mar", "apr", "máj", "jún", "júl", "aug", "sep", "okt", "nov", "dec"];

// Lokálny deň (Europe/Bratislava) ako YYYY-MM-DD.
function localDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function dayLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.`;
}

type LogRow = { exerciseName: string; weightKg: number; reps: number | null; loggedAt: Date };

function windowStartDays(range: ProgressRange): number {
  if (range === "day") return 14;
  if (range === "week") return 12 * 7;
  return 366;
}

// Vytvorí prázdne buckety pre daný rozsah (chronologicky).
function buildBuckets(range: ProgressRange): { key: string; label: string; match: (localIso: string) => boolean }[] {
  const today = new Date();
  const out: { key: string; label: string; match: (localIso: string) => boolean }[] = [];

  if (range === "day") {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const iso = localDay(d);
      out.push({ key: iso, label: dayLabel(iso), match: (x) => x === iso });
    }
    return out;
  }

  if (range === "week") {
    // pondelok aktuálneho týždňa (lokálne)
    const todayIso = localDay(today);
    const dow = (new Date(`${todayIso}T12:00:00Z`).getUTCDay() + 6) % 7; // 0 = pondelok
    const monday0 = new Date(`${todayIso}T12:00:00Z`);
    monday0.setUTCDate(monday0.getUTCDate() - dow);
    for (let i = 11; i >= 0; i--) {
      const start = new Date(monday0.getTime() - i * 7 * 86400000);
      const end = new Date(start.getTime() + 7 * 86400000);
      const startIso = localDay(start);
      const endIso = localDay(end);
      out.push({ key: startIso, label: dayLabel(startIso), match: (x) => x >= startIso && x < endIso });
    }
    return out;
  }

  // year → posledných 12 mesiacov
  const base = new Date(`${localDay(today)}T12:00:00Z`);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(base.getUTCFullYear(), base.getUTCMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const prefix = `${y}-${String(m + 1).padStart(2, "0")}`;
    out.push({ key: prefix, label: SK_MONTHS[m], match: (x) => x.startsWith(prefix) });
  }
  return out;
}

export async function getTrainingProgress(userId: string, range: ProgressRange): Promise<ProgressData> {
  const since = new Date(Date.now() - windowStartDays(range) * 86400000);
  const logs = (await prisma.exerciseLog.findMany({
    where: { userId, loggedAt: { gte: since } },
    orderBy: { loggedAt: "asc" },
    select: { exerciseName: true, weightKg: true, reps: true, loggedAt: true },
  })) as LogRow[];

  const withDay = logs.map((l) => ({ ...l, day: localDay(l.loggedAt), volume: l.weightKg * (l.reps ?? 1) }));

  // Buckety
  const buckets = buildBuckets(range).map((b) => {
    const inBucket = withDay.filter((l) => b.match(l.day));
    const sessions = new Set(inBucket.map((l) => l.day)).size;
    const volume = Math.round(inBucket.reduce((a, l) => a + l.volume, 0));
    return { label: b.label, volume, sessions };
  });

  // Per-cvik progres
  const byName = new Map<string, LogRow[]>();
  for (const l of logs) {
    const arr = byName.get(l.exerciseName) ?? [];
    arr.push(l);
    byName.set(l.exerciseName, arr);
  }
  const exercises: ExerciseProgress[] = [];
  for (const [name, arr] of byName) {
    const sorted = arr.slice().sort((a, b) => a.loggedAt.getTime() - b.loggedAt.getTime());
    const firstKg = sorted[0].weightKg;
    const lastKg = sorted[sorted.length - 1].weightKg;
    const bestKg = Math.max(...sorted.map((l) => l.weightKg));
    const sessions = new Set(sorted.map((l) => localDay(l.loggedAt))).size;
    exercises.push({
      name,
      sessions,
      bestKg,
      firstKg,
      lastKg,
      deltaKg: Math.round((lastKg - firstKg) * 10) / 10,
      lastAt: sorted[sorted.length - 1].loggedAt.toISOString(),
    });
  }
  exercises.sort((a, b) => Date.parse(b.lastAt) - Date.parse(a.lastAt));

  const totalSessions = new Set(withDay.map((l) => l.day)).size;
  const totalVolume = Math.round(withDay.reduce((a, l) => a + l.volume, 0));

  return { range, buckets, totalSessions, totalVolume, exercises: exercises.slice(0, 40) };
}
