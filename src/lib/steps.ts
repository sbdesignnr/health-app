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

export async function getSteps(
  userId: string,
  dateStr?: string,
): Promise<{ steps: number; goal: number }> {
  const day = dateOnly(dateStr ?? bratislavaDate());
  const [row, user] = await Promise.all([
    prisma.stepCount.findUnique({ where: { userId_stepDate: { userId, stepDate: day } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { stepGoal: true } }),
  ]);
  return { steps: row?.steps ?? 0, goal: user?.stepGoal ?? DEFAULT_STEP_GOAL };
}
