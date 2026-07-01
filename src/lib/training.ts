import { prisma } from "./prisma";
import { generateGymProgram, generateFootballPlan, type AiFootballPlan } from "./training-ai";

export type ExerciseDTO = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  intensity: string | null;
  restSec: number | null;
  notes: string | null;
  sortOrder: number;
  lastWeightKg: number | null;
};
export type DayDTO = {
  id: string;
  dayIndex: number;
  title: string;
  focus: string | null;
  exercises: ExerciseDTO[];
};
export type ProgramDTO = {
  id: string;
  kind: "GYM" | "FOOTBALL";
  model: string;
  phase: string;
  summary: string | null;
  createdAt: string;
  days: DayDTO[];
  plan: AiFootballPlan | null;
  reviewAfterDays: number | null;
  guidance: string[] | null;
};

export type ExerciseLogDTO = {
  id: string;
  weightKg: number;
  reps: number | null;
  note: string | null;
  loggedAt: string;
};

// Mapa: názov cviku → posledná zapísaná váha (na rýchly prehľad progresu).
async function lastWeightByName(userId: string): Promise<Map<string, number>> {
  const logs = await prisma.exerciseLog.findMany({
    where: { userId },
    orderBy: { loggedAt: "desc" },
    take: 400,
  });
  const map = new Map<string, number>();
  for (const l of logs) {
    if (!map.has(l.exerciseName)) map.set(l.exerciseName, l.weightKg);
  }
  return map;
}

export async function getActiveProgram(
  userId: string,
  kind: "GYM" | "FOOTBALL",
): Promise<ProgramDTO | null> {
  const program = await prisma.trainingProgram.findFirst({
    where: { userId, kind, active: true },
    orderBy: { createdAt: "desc" },
    include: {
      days: {
        orderBy: [{ sortOrder: "asc" }, { dayIndex: "asc" }],
        include: { exercises: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!program) return null;

  const last = await lastWeightByName(userId);

  return {
    id: program.id,
    kind: program.kind,
    model: program.model,
    phase: program.phase,
    summary: program.summary,
    createdAt: program.createdAt.toISOString(),
    plan: (program.plan as AiFootballPlan | null) ?? null,
    reviewAfterDays: program.reviewAfterDays ?? null,
    guidance: (program.guidance as string[] | null) ?? null,
    days: program.days.map((d) => ({
      id: d.id,
      dayIndex: d.dayIndex,
      title: d.title,
      focus: d.focus,
      exercises: d.exercises.map((e) => ({
        id: e.id,
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        intensity: e.intensity,
        restSec: e.restSec,
        notes: e.notes,
        sortOrder: e.sortOrder,
        lastWeightKg: last.get(e.name) ?? null,
      })),
    })),
  };
}

export async function generateAndSaveGymProgram(userId: string): Promise<ProgramDTO> {
  const { program, context, model } = await generateGymProgram(userId);

  await prisma.$transaction(async (tx) => {
    await tx.trainingProgram.updateMany({
      where: { userId, kind: "GYM", active: true },
      data: { active: false },
    });
    await tx.trainingProgram.create({
      data: {
        userId,
        kind: "GYM",
        model,
        phase: program.phase,
        summary: program.summary,
        reviewAfterDays: program.reviewAfterDays,
        guidance: program.guidance,
        context: { prompt: context },
        active: true,
        days: {
          create: program.days.map((d, di) => ({
            dayIndex: di + 1,
            title: d.title,
            focus: d.focus,
            sortOrder: di,
            exercises: {
              create: d.exercises.map((e, ei) => ({
                name: e.name,
                sets: e.sets,
                reps: e.reps,
                intensity: e.intensity || null,
                restSec: Number.isFinite(e.restSec) ? e.restSec : null,
                notes: e.notes || null,
                sortOrder: ei,
              })),
            },
          })),
        },
      },
    });
  });

  const saved = await getActiveProgram(userId, "GYM");
  if (!saved) throw new Error("Program sa nepodarilo načítať.");
  return saved;
}

export async function generateAndSaveFootballProgram(userId: string): Promise<ProgramDTO> {
  const { result, context, model } = await generateFootballPlan(userId);

  await prisma.$transaction(async (tx) => {
    await tx.trainingProgram.updateMany({
      where: { userId, kind: "FOOTBALL", active: true },
      data: { active: false },
    });
    await tx.trainingProgram.create({
      data: {
        userId,
        kind: "FOOTBALL",
        model,
        phase: result.phase,
        summary: result.summary,
        reviewAfterDays: result.reviewAfterDays,
        guidance: result.guidance,
        context: { prompt: context },
        plan: result.plan,
        active: true,
      },
    });
  });

  const saved = await getActiveProgram(userId, "FOOTBALL");
  if (!saved) throw new Error("Plán sa nepodarilo načítať.");
  return saved;
}

export async function logExercise(
  userId: string,
  data: { exerciseName: string; weightKg: number; reps?: number | null; note?: string | null },
): Promise<ExerciseLogDTO> {
  const created = await prisma.exerciseLog.create({
    data: {
      userId,
      exerciseName: data.exerciseName,
      weightKg: data.weightKg,
      reps: data.reps ?? null,
      note: data.note ?? null,
    },
  });
  return {
    id: created.id,
    weightKg: created.weightKg,
    reps: created.reps,
    note: created.note,
    loggedAt: created.loggedAt.toISOString(),
  };
}

export async function getExerciseHistory(
  userId: string,
  exerciseName: string,
  limit = 20,
): Promise<ExerciseLogDTO[]> {
  const logs = await prisma.exerciseLog.findMany({
    where: { userId, exerciseName },
    orderBy: { loggedAt: "desc" },
    take: limit,
  });
  return logs.map((l) => ({
    id: l.id,
    weightKg: l.weightKg,
    reps: l.reps,
    note: l.note,
    loggedAt: l.loggedAt.toISOString(),
  }));
}
