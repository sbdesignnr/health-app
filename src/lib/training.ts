import { prisma } from "./prisma";
import { generateGymProgram, generateFootballPlan, type AiFootballPlan } from "./training-ai";
import { recentLogsByName, suggestNextLoad, type LoadSuggestion } from "./progressive-overload";
import { bratislavaDate } from "./workout";

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
  warmupSets: number | null;
  sets: number;
  reps: string;
  intensity: string | null;
  restSec: number | null;
  notes: string | null;
  rationale: string | null;
  sortOrder: number;
  lastWeightKg: number | null;
  suggestion: LoadSuggestion | null;
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
  setNumber: number | null;
  weightKg: number;
  reps: number | null;
  note: string | null;
  loggedAt: string;
};

// Jeden tréning (deň) = skupina sérií toho istého cviku.
export type ExerciseSessionDTO = {
  date: string; // YYYY-MM-DD (lokálne, Europe/Bratislava)
  sets: ExerciseLogDTO[];
  topWeightKg: number; // najťažšia séria dňa
  topReps: number | null; // opakovania najťažšej série
  volumeKg: number; // Σ váha × opakovania
  totalReps: number;
};

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

  const recent = await recentLogsByName(userId);

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
      exercises: d.exercises.map((e) => {
        const exLogs = recent.get(e.name) ?? [];
        return {
          id: e.id,
          name: e.name,
          warmupSets: e.warmupSets,
          sets: e.sets,
          reps: e.reps,
          intensity: e.intensity,
          restSec: e.restSec,
          notes: e.notes,
          rationale: e.rationale,
          sortOrder: e.sortOrder,
          lastWeightKg: exLogs[0]?.weightKg ?? null,
          suggestion: suggestNextLoad(exLogs, e.reps),
        };
      }),
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
                warmupSets: Number.isFinite(e.warmupSets) ? e.warmupSets : null,
                sets: e.sets,
                reps: e.reps,
                intensity: e.intensity || null,
                restSec: Number.isFinite(e.restSec) ? e.restSec : null,
                notes: e.notes || null,
                rationale: e.rationale || null,
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

// Koľká pracovná séria dnešného tréningu to je (pre daný cvik).
// Deň určujeme cez bratislavaDate() (nie cez UTC rozsah), aby to sedelo aj cez letný/zimný čas.
export async function nextSetNumber(userId: string, exerciseName: string): Promise<number> {
  const today = bratislavaDate();
  const recent = await prisma.exerciseLog.findMany({
    where: { userId, exerciseName },
    orderBy: { loggedAt: "desc" },
    take: 40,
    select: { loggedAt: true },
  });
  return recent.filter((l) => bratislavaDate(l.loggedAt) === today).length + 1;
}

export async function logExercise(
  userId: string,
  data: {
    exerciseName: string;
    weightKg: number;
    reps?: number | null;
    setNumber?: number | null;
    note?: string | null;
  },
): Promise<ExerciseLogDTO> {
  const setNumber =
    data.setNumber != null && data.setNumber > 0
      ? Math.round(data.setNumber)
      : await nextSetNumber(userId, data.exerciseName);

  const created = await prisma.exerciseLog.create({
    data: {
      userId,
      exerciseName: data.exerciseName,
      setNumber,
      weightKg: data.weightKg,
      reps: data.reps ?? null,
      note: data.note ?? null,
    },
  });
  return {
    id: created.id,
    setNumber: created.setNumber,
    weightKg: created.weightKg,
    reps: created.reps,
    note: created.note,
    loggedAt: created.loggedAt.toISOString(),
  };
}

// Zmaže jednu sériu (len vlastnú).
export async function deleteExerciseLog(userId: string, id: string): Promise<void> {
  await prisma.exerciseLog.deleteMany({ where: { id, userId } });
}

// Upraví už zapísanú sériu (váha / opakovania).
export async function updateExerciseLog(
  userId: string,
  id: string,
  patch: { weightKg?: number; reps?: number | null },
): Promise<boolean> {
  const own = await prisma.exerciseLog.findFirst({ where: { id, userId }, select: { id: true } });
  if (!own) return false;
  await prisma.exerciseLog.update({
    where: { id },
    data: {
      weightKg: patch.weightKg !== undefined ? patch.weightKg : undefined,
      reps: patch.reps === undefined ? undefined : patch.reps,
    },
  });
  return true;
}

export async function getExerciseHistory(
  userId: string,
  exerciseName: string,
  limit = 150,
): Promise<ExerciseLogDTO[]> {
  const logs = await prisma.exerciseLog.findMany({
    where: { userId, exerciseName },
    orderBy: { loggedAt: "desc" },
    take: limit,
  });
  return logs.map((l) => ({
    id: l.id,
    setNumber: l.setNumber,
    weightKg: l.weightKg,
    reps: l.reps,
    note: l.note,
    loggedAt: l.loggedAt.toISOString(),
  }));
}

/**
 * História cviku zoskupená po TRÉNINGOCH (dňoch) – to je to, čo používateľ reálne vidí:
 * "12.11. · 60×10, 65×8, 65×7 · objem 1 730 kg". Najnovší tréning je prvý.
 */
export async function getExerciseSessions(
  userId: string,
  exerciseName: string,
  maxSessions = 20,
): Promise<ExerciseSessionDTO[]> {
  const logs = await prisma.exerciseLog.findMany({
    where: { userId, exerciseName },
    orderBy: { loggedAt: "desc" },
    take: 400,
  });

  const byDay = new Map<string, ExerciseLogDTO[]>();
  for (const l of logs) {
    const day = bratislavaDate(l.loggedAt);
    const arr = byDay.get(day) ?? [];
    arr.push({
      id: l.id,
      setNumber: l.setNumber,
      weightKg: l.weightKg,
      reps: l.reps,
      note: l.note,
      loggedAt: l.loggedAt.toISOString(),
    });
    byDay.set(day, arr);
  }

  const sessions: ExerciseSessionDTO[] = [];
  for (const [date, raw] of byDay) {
    // v rámci dňa chronologicky (séria 1 → n)
    const sets = raw
      .slice()
      .sort((a, b) =>
        a.setNumber != null && b.setNumber != null
          ? a.setNumber - b.setNumber
          : Date.parse(a.loggedAt) - Date.parse(b.loggedAt),
      );
    let top = sets[0];
    for (const s of sets) {
      if (s.weightKg > top.weightKg || (s.weightKg === top.weightKg && (s.reps ?? 0) > (top.reps ?? 0))) {
        top = s;
      }
    }
    sessions.push({
      date,
      sets,
      topWeightKg: top.weightKg,
      topReps: top.reps,
      volumeKg: Math.round(sets.reduce((a, s) => a + s.weightKg * (s.reps ?? 0), 0)),
      totalReps: sets.reduce((a, s) => a + (s.reps ?? 0), 0),
    });
  }

  sessions.sort((a, b) => (a.date < b.date ? 1 : -1));
  return sessions.slice(0, maxSessions);
}

// Zavolané po zmene ZÁPASU v rozvrhu (pridaný/presunutý/zmazaný) – ak má hráč aktívny
// gym a/alebo futbalový program, prepočíta ich od dneška, nech plán reálne sedí
// na nový termín (tapering, rozloženie záťaže). Gym ide prvý, football druhý (koordinácia dní).
export async function regenerateProgramsAfterMatchChange(userId: string): Promise<void> {
  const [hasGym, hasFootball] = await Promise.all([
    prisma.trainingProgram.findFirst({ where: { userId, kind: "GYM", active: true }, select: { id: true } }),
    prisma.trainingProgram.findFirst({ where: { userId, kind: "FOOTBALL", active: true }, select: { id: true } }),
  ]);
  if (hasGym) await generateAndSaveGymProgram(userId, 0).catch(() => {});
  if (hasFootball) await generateAndSaveFootballProgram(userId, 0).catch(() => {});
}
