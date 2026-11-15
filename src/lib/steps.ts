import { prisma } from "./prisma";
import { bratislavaDate } from "./workout";

export const DEFAULT_STEP_GOAL = 9000;

function dateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

// Nastaví kroky pre daný deň (upsert). Berie vyššiu hodnotu – kroky cez deň len rastú.
export async function setSteps(userId: string, steps: number, dateStr?: string): Promise<number> {
  const day = dateOnly(dateStr ?? bratislavaDate());
  const value = Math.max(0, Math.round(steps));
  const existing = await prisma.stepCount.findUnique({
    where: { userId_stepDate: { userId, stepDate: day } },
    select: { steps: true },
  });
  const final = existing ? Math.max(existing.steps, value) : value;
  await prisma.stepCount.upsert({
    where: { userId_stepDate: { userId, stepDate: day } },
    create: { userId, stepDate: day, steps: final },
    update: { steps: final },
  });
  return final;
}

// Prepíše kroky presnou hodnotou (manuálna korekcia).
export async function overwriteSteps(userId: string, steps: number, dateStr?: string): Promise<number> {
  const day = dateOnly(dateStr ?? bratislavaDate());
  const value = Math.max(0, Math.round(steps));
  await prisma.stepCount.upsert({
    where: { userId_stepDate: { userId, stepDate: day } },
    create: { userId, stepDate: day, steps: value },
    update: { steps: value },
  });
  return value;
}

export type StepsDay = { date: string; steps: number };

export type StepsData = {
  date: string;
  steps: number;
  goal: number;
  /** Kedy naposledy prišli kroky (ISO) – aby bolo vidno, či sync zo Zdravia vôbec beží. */
  syncedAt: string | null;
  /** Posledných 7 dní vrátane dneška (chronologicky). */
  week: StepsDay[];
};

export async function getSteps(userId: string, dateStr?: string): Promise<StepsData> {
  const dayStr = dateStr ?? bratislavaDate();
  const day = dateOnly(dayStr);
  const weekStart = new Date(day.getTime() - 6 * 86400000);

  const [row, user, week] = await Promise.all([
    prisma.stepCount.findUnique({ where: { userId_stepDate: { userId, stepDate: day } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { stepGoal: true } }),
    prisma.stepCount.findMany({
      where: { userId, stepDate: { gte: weekStart, lte: day } },
      orderBy: { stepDate: "asc" },
      select: { stepDate: true, steps: true },
    }),
  ]);

  const byDay = new Map(week.map((w) => [w.stepDate.toISOString().slice(0, 10), w.steps]));
  const series: StepsDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(day.getTime() - i * 86400000).toISOString().slice(0, 10);
    series.push({ date: d, steps: byDay.get(d) ?? 0 });
  }

  return {
    date: dayStr,
    steps: row?.steps ?? 0,
    goal: user?.stepGoal ?? DEFAULT_STEP_GOAL,
    syncedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
    week: series,
  };
}
