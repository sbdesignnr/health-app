import { prisma } from "./prisma";
import { generateGymProgram, generateFootballPlan, type AiFootballPlan } from "./training-ai";

// Mapuje odhadované RPE AI programu na Intensity enum rozvrhu.
function intensityFromRpe(rpe: number): "LOW" | "MEDIUM" | "HIGH" {
  if (rpe <= 4) return "LOW";
  if (rpe <= 7) return "MEDIUM";
  return "HIGH";
}

// Zapíše dni AI programu (gym alebo futbal individuálne) do Rozvrhu ako opakujúce sa udalosti,
// aby sa reálne počítali do TDEE/makier aj do týždennej záťaže a upozornení (nielen do modulu samého).
// Pri každej regenerácii najprv zmaže predošlé AI-zapísané dni rovnakého pôvodu (manuálne udalosti nechá).
async function syncScheduleFromProgram(
  userId: string,
  origin: "AI_GYM" | "AI_FOOTBALL",
  eventType: "GYM" | "FOOTBALL_TRAINING",
  days: { dayOfWeek: number; title: string; focus: string | null; durationMin: number; rpe: number }[],
): Promise<void> {
  await prisma.scheduleEvent.deleteMany({ where: { userId, origin } });
  if (days.length === 0) return;
  await prisma.scheduleEvent.createMany({
    data: days.map((d) => ({
      userId,
      type: eventType,
      title: d.title,
      gymFocus: eventType === "GYM" ? d.focus : null,
      intensity: intensityFromRpe(d.rpe),
      isRecurring: true,
      dayOfWeek: d.dayOfWeek,
      durationMin: d.durationMin,
      rpe: d.rpe,
      origin,
    })),
  });
}

function startDateFor(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

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
  dayOfWeek: number | null;
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
  startDate: string | null;
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
    startDate: program.startDate ? program.startDate.toISOString().slice(0, 10) : null,
    days: program.days.map((d) => ({
      id: d.id,
      dayIndex: d.dayIndex,
      title: d.title,
      focus: d.focus,
      dayOfWeek: d.dayOfWeek,
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

export async function generateAndSaveGymProgram(
  userId: string,
  startOffset = 0,
): Promise<ProgramDTO> {
  const startStr = startDateFor(startOffset);
  const { program, context, model } = await generateGymProgram(userId, startStr);

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
        startDate: new Date(`${startStr}T00:00:00Z`),
        context: { prompt: context },
        active: true,
        days: {
          create: program.days.map((d, di) => ({
            dayIndex: di + 1,
            title: d.title,
            focus: d.focus,
            dayOfWeek: d.dayOfWeek,
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

  await syncScheduleFromProgram(
    userId,
    "AI_GYM",
    "GYM",
    program.days.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      title: d.title,
      focus: d.focus,
      durationMin: d.estimatedDurationMin,
      rpe: d.estimatedRpe,
    })),
  );

  const saved = await getActiveProgram(userId, "GYM");
  if (!saved) throw new Error("Program sa nepodarilo načítať.");
  return saved;
}

export async function generateAndSaveFootballProgram(
  userId: string,
  startOffset = 0,
): Promise<ProgramDTO> {
  const startStr = startDateFor(startOffset);
  const { result, context, model } = await generateFootballPlan(userId, startStr);

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
        startDate: new Date(`${startStr}T00:00:00Z`),
        context: { prompt: context },
        plan: result.plan,
        active: true,
      },
    });
  });

  await syncScheduleFromProgram(
    userId,
    "AI_FOOTBALL",
    "FOOTBALL_TRAINING",
    result.plan.individualSessions.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      title: s.title,
      focus: s.focus,
      durationMin: s.estimatedDurationMin,
      rpe: s.estimatedRpe,
    })),
  );

  const saved = await getActiveProgram(userId, "FOOTBALL");
  if (!saved) throw new Error("Plán sa nepodarilo načítať.");
  return saved;
}

// Nahradí/premenuje cvik v pláne (napr. Drep → Hack squat). Overí vlastníctvo.
export async function renameExercise(
  userId: string,
  exerciseId: string,
  name: string,
): Promise<boolean> {
  const ex = await prisma.programExercise.findFirst({
    where: { id: exerciseId },
    include: { day: { include: { program: true } } },
  });
  if (!ex || ex.day.program.userId !== userId) return false;
  await prisma.programExercise.update({ where: { id: exerciseId }, data: { name: name.trim() } });
  return true;
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
