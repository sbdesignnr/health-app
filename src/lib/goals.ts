import { prisma } from "./prisma";
import {
  ageFromBirthDate,
  baselineTdee,
  bmrMifflinStJeor,
  GOAL_ADJUSTMENT,
  macroTargets,
  targetCaloriesFromTdee,
  type GoalType,
} from "./energy";
import { getDayTrainingBurnKcal } from "./schedule";
import { getDayActualBurnKcal } from "./workout";

export type DailyTargets = {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  isDefault: boolean; // true = predvolené (profil/váha ešte nie sú vyplnené)
};

export type EnergyBreakdown = {
  complete: boolean;
  missing: string[];
  bmr: number | null;
  baselineTdee: number | null;
  trainingKcal: number;
  tdee: number | null;
  goalType: GoalType;
  adjustmentPct: number;
  targets: DailyTargets;
};

const DEFAULT_TARGETS = { caloriesKcal: 2400, proteinG: 170, carbsG: 250, fatG: 80 };

export async function getActiveGoal(userId: string) {
  return prisma.goal.findFirst({
    where: { userId, validTo: null },
    orderBy: { validFrom: "desc" },
  });
}

export async function getEnergyBreakdown(userId: string, dateStr?: string): Promise<EnergyBreakdown> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const goal = await getActiveGoal(userId);
  const goalType = (goal?.type ?? "MAINTAIN_PERFORMANCE") as GoalType;
  const adjustmentPct = GOAL_ADJUSTMENT[goalType];

  // 1) Explicitný custom cieľ (zadané kalórie) – má prednosť.
  if (goal?.targetCalories != null) {
    return {
      complete: true,
      missing: [],
      bmr: null,
      baselineTdee: null,
      trainingKcal: 0,
      tdee: null,
      goalType,
      adjustmentPct,
      targets: {
        caloriesKcal: goal.targetCalories,
        proteinG: goal.targetProteinG ?? DEFAULT_TARGETS.proteinG,
        carbsG: goal.targetCarbsG ?? DEFAULT_TARGETS.carbsG,
        fatG: goal.targetFatG ?? DEFAULT_TARGETS.fatG,
        isDefault: false,
      },
    };
  }

  // 2) Výpočet z profilu + váhy.
  const missing: string[] = [];
  if (!user?.heightCm) missing.push("výška");
  if (!user?.birthDate) missing.push("dátum narodenia");
  if (!user?.sex) missing.push("pohlavie");
  if (!user?.currentWeightKg) missing.push("váha");

  if (
    !user ||
    user.heightCm == null ||
    user.birthDate == null ||
    user.sex == null ||
    user.currentWeightKg == null
  ) {
    return {
      complete: false,
      missing,
      bmr: null,
      baselineTdee: null,
      trainingKcal: 0,
      tdee: null,
      goalType,
      adjustmentPct,
      targets: { ...DEFAULT_TARGETS, isDefault: true },
    };
  }

  const age = ageFromBirthDate(user.birthDate);
  const bmr = bmrMifflinStJeor({
    weightKg: user.currentWeightKg,
    heightCm: user.heightCm,
    age,
    sex: user.sex,
  });
  const baseline = baselineTdee(bmr, user.activityLevel);
  // Reálny výdaj (Apple Watch / manuál) má prednosť pred MET odhadom.
  const estimatedBurn = await getDayTrainingBurnKcal(userId, user.currentWeightKg, dateStr);
  const actualBurn = await getDayActualBurnKcal(userId, dateStr);
  const trainingKcal = actualBurn ?? estimatedBurn;
  const tdee = baseline + trainingKcal;
  const caloriesKcal = targetCaloriesFromTdee(tdee, goalType);
  const macros = macroTargets({ caloriesKcal, weightKg: user.currentWeightKg, goalType });

  return {
    complete: true,
    missing: [],
    bmr,
    baselineTdee: baseline,
    trainingKcal,
    tdee,
    goalType,
    adjustmentPct,
    targets: { caloriesKcal, ...macros, isDefault: false },
  };
}

export async function getDailyTargets(userId: string, dateStr?: string): Promise<DailyTargets> {
  return (await getEnergyBreakdown(userId, dateStr)).targets;
}
