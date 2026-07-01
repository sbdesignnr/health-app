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
    likes?: string[];
    supplements?: string[];
    healthConcerns?: string[];
    healthNotes?: string | null;
    wakeTime?: string | null;
    sleepTime?: string | null;
    stressLevel?: number | null;
    sleepQuality?: number | null;
    footballLeague?: string | null;
    footballPosition?: string | null;
    yearsPlaying?: number | null;
    matchMinutes?: number | null;
    dominantFoot?: string | null;
    seasonStartDate?: string | null;
    gymDaysPerWeek?: number | null;
    trainingExperience?: string | null;
    stepGoal?: number | null;
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
      likes: data.likes === undefined ? undefined : data.likes,
      supplements: data.supplements === undefined ? undefined : data.supplements,
      healthConcerns: data.healthConcerns === undefined ? undefined : data.healthConcerns,
      healthNotes: data.healthNotes === undefined ? undefined : data.healthNotes,
      wakeTime: data.wakeTime === undefined ? undefined : data.wakeTime,
      sleepTime: data.sleepTime === undefined ? undefined : data.sleepTime,
      stressLevel: data.stressLevel === undefined ? undefined : data.stressLevel,
      sleepQuality: data.sleepQuality === undefined ? undefined : data.sleepQuality,
      footballLeague: data.footballLeague === undefined ? undefined : data.footballLeague,
      footballPosition: data.footballPosition === undefined ? undefined : data.footballPosition,
      yearsPlaying: data.yearsPlaying === undefined ? undefined : data.yearsPlaying,
      matchMinutes: data.matchMinutes === undefined ? undefined : data.matchMinutes,
      dominantFoot: data.dominantFoot === undefined ? undefined : data.dominantFoot,
      seasonStartDate:
        data.seasonStartDate === undefined
          ? undefined
          : data.seasonStartDate
            ? new Date(data.seasonStartDate)
            : null,
      gymDaysPerWeek: data.gymDaysPerWeek === undefined ? undefined : data.gymDaysPerWeek,
      trainingExperience:
        data.trainingExperience === undefined ? undefined : data.trainingExperience,
      stepGoal: data.stepGoal === undefined ? undefined : data.stepGoal,
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
