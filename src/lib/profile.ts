import { prisma } from "./prisma";
import type { ActivityLevel, GoalType, Sex } from "./energy";

export async function getProfile(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function updateProfile(
  userId: string,
  data: {
    name?: string | null;
    heightCm?: number | null;
    birthDate?: string | null;
    sex?: Sex | null;
    activityLevel?: ActivityLevel;
    dietType?: string | null;
    allergies?: string[];
    dislikes?: string[];
  },
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name === undefined ? undefined : data.name,
      heightCm: data.heightCm ?? undefined,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      sex: data.sex ?? undefined,
      activityLevel: data.activityLevel ?? undefined,
      dietType: data.dietType === undefined ? undefined : data.dietType,
      allergies: data.allergies === undefined ? undefined : data.allergies,
      dislikes: data.dislikes === undefined ? undefined : data.dislikes,
    },
  });
}

// Nastav typ cieľa s históriou: zatvor aktuálny (validTo), otvor nový – ak sa zmenil.
export async function setGoalType(userId: string, type: GoalType) {
  const active = await prisma.goal.findFirst({
    where: { userId, validTo: null },
    orderBy: { validFrom: "desc" },
  });
  if (active && active.type === type) return active;
  if (active) {
    await prisma.goal.update({ where: { id: active.id }, data: { validTo: new Date() } });
  }
  return prisma.goal.create({ data: { userId, type, validFrom: new Date() } });
}
