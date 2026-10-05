import { prisma } from "./prisma";

export type GymPhase = "IN_SEASON" | "BREAK";

export type GymSplitDayDTO = {
  id: string;
  dayOfWeek: number;
  focus: string;
  sortOrder: number;
};

export type GymSplitTemplate = {
  IN_SEASON: GymSplitDayDTO[];
  BREAK: GymSplitDayDTO[];
};

function toDTO(row: { id: string; dayOfWeek: number; focus: string; sortOrder: number }): GymSplitDayDTO {
  return { id: row.id, dayOfWeek: row.dayOfWeek, focus: row.focus, sortOrder: row.sortOrder };
}

export async function getGymSplitTemplate(userId: string): Promise<GymSplitTemplate> {
  const rows = await prisma.gymSplitDay.findMany({
    where: { userId },
    orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
  });
  return {
    IN_SEASON: rows.filter((r) => r.phase === "IN_SEASON").map(toDTO),
    BREAK: rows.filter((r) => r.phase === "BREAK").map(toDTO),
  };
}

// Pre AI kontext – len dni danej fázy, zoradené.
export async function getGymSplitForPhase(userId: string, phase: GymPhase): Promise<GymSplitDayDTO[]> {
  const rows = await prisma.gymSplitDay.findMany({
    where: { userId, phase },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(toDTO);
}

// Nahradí CELÝ rozvrh pre danú fázu (jednoduchšie a predvídateľnejšie než diffovanie jednotlivých dní).
export async function setGymSplitForPhase(
  userId: string,
  phase: GymPhase,
  days: { dayOfWeek: number; focus: string }[],
): Promise<GymSplitDayDTO[]> {
  await prisma.$transaction([
    prisma.gymSplitDay.deleteMany({ where: { userId, phase } }),
    ...(days.length > 0
      ? [
          prisma.gymSplitDay.createMany({
            data: days.map((d, i) => ({
              userId,
              phase,
              dayOfWeek: d.dayOfWeek,
              focus: d.focus.trim().slice(0, 40),
              sortOrder: i,
            })),
          }),
        ]
      : []),
  ]);
  return getGymSplitForPhase(userId, phase);
}
