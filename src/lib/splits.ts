import { prisma } from "./prisma";
import {
  sessionsByName,
  suggestNextLoad,
  topSetOf,
  type ExerciseSession,
  type LoadSuggestion,
} from "./progressive-overload";

// Posledný odtrénovaný deň cviku – aby bolo v zozname hneď vidno, čo naposledy zdvihol.
export type LastSessionDTO = {
  date: string; // YYYY-MM-DD
  setCount: number;
  volumeKg: number;
  summary: string; // "60×10 · 65×8 · 65×7"
};

export type SplitExerciseDTO = {
  id: string;
  name: string;
  targetSets: number | null;
  targetReps: string | null;
  note: string | null;
  sortOrder: number;
  lastWeightKg: number | null;
  lastSession: LastSessionDTO | null;
  suggestion: LoadSuggestion | null;
};

export type SplitDTO = {
  id: string;
  name: string;
  note: string | null;
  sortOrder: number;
  exercises: SplitExerciseDTO[];
};

type SplitRow = {
  id: string;
  name: string;
  note: string | null;
  sortOrder: number;
  exercises: {
    id: string;
    name: string;
    targetSets: number | null;
    targetReps: string | null;
    note: string | null;
    sortOrder: number;
  }[];
};

function sessionToDTO(session: ExerciseSession): LastSessionDTO {
  return {
    date: session.date,
    setCount: session.sets.length,
    volumeKg: session.volumeKg,
    summary: session.sets
      .map((x) => `${x.weightKg}${x.reps != null ? `×${x.reps}` : ""}`)
      .join(" · "),
  };
}

function toDTO(s: SplitRow, recent: Map<string, ExerciseSession[]>): SplitDTO {
  return {
    id: s.id,
    name: s.name,
    note: s.note,
    sortOrder: s.sortOrder,
    exercises: s.exercises
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((e) => {
        const exSessions = recent.get(e.name) ?? [];
        const topSets = exSessions.map(topSetOf);
        return {
          id: e.id,
          name: e.name,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          note: e.note,
          sortOrder: e.sortOrder,
          lastWeightKg: topSets[0]?.weightKg ?? null,
          lastSession: exSessions[0] ? sessionToDTO(exSessions[0]) : null,
          suggestion: suggestNextLoad(topSets, e.targetReps),
        };
      }),
  };
}

export async function listSplits(userId: string): Promise<SplitDTO[]> {
  const [splits, recent] = await Promise.all([
    prisma.workoutSplit.findMany({
      where: { userId },
      include: { exercises: true },
      orderBy: { sortOrder: "asc" },
    }),
    sessionsByName(userId),
  ]);
  return (splits as SplitRow[]).map((s) => toDTO(s, recent));
}

export async function createSplit(
  userId: string,
  input: { name: string; note?: string | null; exercises?: { name: string; targetSets?: number | null; targetReps?: string | null; note?: string | null }[] },
): Promise<SplitDTO> {
  const count = await prisma.workoutSplit.count({ where: { userId } });
  const created = await prisma.workoutSplit.create({
    data: {
      userId,
      name: input.name.slice(0, 60),
      note: input.note?.slice(0, 200) ?? null,
      sortOrder: count,
      exercises: {
        create: (input.exercises ?? []).map((e, i) => ({
          name: e.name.slice(0, 80),
          targetSets: e.targetSets ?? null,
          targetReps: e.targetReps?.slice(0, 20) ?? null,
          note: e.note?.slice(0, 120) ?? null,
          sortOrder: i,
        })),
      },
    },
    include: { exercises: true },
  });
  const recent = await sessionsByName(userId);
  return toDTO(created as SplitRow, recent);
}

async function ownsSplit(userId: string, splitId: string): Promise<boolean> {
  const s = await prisma.workoutSplit.findFirst({ where: { id: splitId, userId }, select: { id: true } });
  return !!s;
}

export async function updateSplit(
  userId: string,
  splitId: string,
  patch: { name?: string; note?: string | null },
): Promise<boolean> {
  if (!(await ownsSplit(userId, splitId))) return false;
  await prisma.workoutSplit.update({
    where: { id: splitId },
    data: {
      name: patch.name?.slice(0, 60),
      note: patch.note === undefined ? undefined : (patch.note?.slice(0, 200) ?? null),
    },
  });
  return true;
}

export async function deleteSplit(userId: string, splitId: string): Promise<boolean> {
  if (!(await ownsSplit(userId, splitId))) return false;
  await prisma.workoutSplit.delete({ where: { id: splitId } });
  return true;
}

export async function addExercise(
  userId: string,
  splitId: string,
  input: { name: string; targetSets?: number | null; targetReps?: string | null; note?: string | null },
): Promise<boolean> {
  if (!(await ownsSplit(userId, splitId))) return false;
  const count = await prisma.splitExercise.count({ where: { splitId } });
  await prisma.splitExercise.create({
    data: {
      splitId,
      name: input.name.slice(0, 80),
      targetSets: input.targetSets ?? null,
      targetReps: input.targetReps?.slice(0, 20) ?? null,
      note: input.note?.slice(0, 120) ?? null,
      sortOrder: count,
    },
  });
  return true;
}

/**
 * Prepíše poradie cvikov v splite podľa doručeného zoznamu ID.
 * Cviky, ktoré v zozname chýbajú, si poradie udržia za tými zoradenými.
 */
export async function reorderExercises(
  userId: string,
  splitId: string,
  exerciseIds: string[],
): Promise<boolean> {
  if (!(await ownsSplit(userId, splitId))) return false;

  const existing = await prisma.splitExercise.findMany({
    where: { splitId },
    select: { id: true },
  });
  const valid = new Set(existing.map((e) => e.id));
  const ordered = exerciseIds.filter((id) => valid.has(id));
  if (ordered.length === 0) return false;

  const rest = existing.map((e) => e.id).filter((id) => !ordered.includes(id));
  const final = [...ordered, ...rest];

  await prisma.$transaction(
    final.map((id, i) =>
      prisma.splitExercise.update({ where: { id }, data: { sortOrder: i } }),
    ),
  );
  return true;
}

async function exerciseOwner(userId: string, exerciseId: string) {
  return prisma.splitExercise.findFirst({
    where: { id: exerciseId, split: { userId } },
    select: { id: true },
  });
}

export async function updateExercise(
  userId: string,
  exerciseId: string,
  patch: { name?: string; targetSets?: number | null; targetReps?: string | null; note?: string | null },
): Promise<boolean> {
  if (!(await exerciseOwner(userId, exerciseId))) return false;
  await prisma.splitExercise.update({
    where: { id: exerciseId },
    data: {
      name: patch.name?.slice(0, 80),
      targetSets: patch.targetSets === undefined ? undefined : patch.targetSets,
      targetReps: patch.targetReps === undefined ? undefined : (patch.targetReps?.slice(0, 20) ?? null),
      note: patch.note === undefined ? undefined : (patch.note?.slice(0, 120) ?? null),
    },
  });
  return true;
}

export async function deleteExercise(userId: string, exerciseId: string): Promise<boolean> {
  if (!(await exerciseOwner(userId, exerciseId))) return false;
  await prisma.splitExercise.delete({ where: { id: exerciseId } });
  return true;
}
