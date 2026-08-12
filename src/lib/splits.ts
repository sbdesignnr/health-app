import { prisma } from "./prisma";

export type SplitExerciseDTO = {
  id: string;
  name: string;
  targetSets: number | null;
  targetReps: string | null;
  note: string | null;
  sortOrder: number;
  lastWeightKg: number | null;
};

export type SplitDTO = {
  id: string;
  name: string;
  note: string | null;
  sortOrder: number;
  exercises: SplitExerciseDTO[];
};

// Posledná zapísaná váha podľa názvu cviku (zdieľané s AI plánom – rovnaký názov = rovnaká história).
async function lastWeightByName(userId: string): Promise<Map<string, number>> {
  const logs = await prisma.exerciseLog.findMany({
    where: { userId },
    orderBy: { loggedAt: "desc" },
    take: 500,
  });
  const map = new Map<string, number>();
  for (const l of logs) if (!map.has(l.exerciseName)) map.set(l.exerciseName, l.weightKg);
  return map;
}

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

function toDTO(s: SplitRow, last: Map<string, number>): SplitDTO {
  return {
    id: s.id,
    name: s.name,
    note: s.note,
    sortOrder: s.sortOrder,
    exercises: s.exercises
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((e) => ({
        id: e.id,
        name: e.name,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
        note: e.note,
        sortOrder: e.sortOrder,
        lastWeightKg: last.get(e.name) ?? null,
      })),
  };
}

export async function listSplits(userId: string): Promise<SplitDTO[]> {
  const [splits, last] = await Promise.all([
    prisma.workoutSplit.findMany({
      where: { userId },
      include: { exercises: true },
      orderBy: { sortOrder: "asc" },
    }),
    lastWeightByName(userId),
  ]);
  return (splits as SplitRow[]).map((s) => toDTO(s, last));
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
  const last = await lastWeightByName(userId);
  return toDTO(created as SplitRow, last);
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
