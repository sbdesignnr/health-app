// Energetický výpočet: BMR, TDEE (NEAT + MET tréningy), cieľové kalórie a makrá.
// Zdroje:
// - Mifflin MD, St Jeor ST, et al. (1990) – BMR rovnica.
// - Ainsworth et al., Compendium of Physical Activities (2011, update 2024) – MET hodnoty.
// - ISSN position stand (2017) – príjem bielkovín 1.6–2.2 g/kg pri silovom tréningu/redukcii.

export type Sex = "MALE" | "FEMALE";
export type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";
export type GoalType = "LOSE_FAT" | "GAIN_MUSCLE" | "MAINTAIN_PERFORMANCE" | "CUSTOM";

// Vek z dátumu narodenia (ročná presnosť stačí).
export function ageFromBirthDate(birthDate: Date): number {
  const now = new Date();
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const m = now.getUTCMonth() - birthDate.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return age;
}

// Mifflin–St Jeor: BMR = 10*kg + 6.25*cm − 5*vek (+5 muži / −161 ženy).
export function bmrMifflinStJeor(p: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
}): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return Math.round(base + (p.sex === "MALE" ? 5 : -161));
}

// NEAT-only multiplikátory: ZÁMERNE nižšie ako klasické 1.2–1.9, lebo tréningy
// pripočítavame zvlášť cez MET (inak by sme bazál + tréning počítali dvakrát).
const NEAT_FACTOR: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.3,
  MODERATE: 1.4,
  ACTIVE: 1.5,
  VERY_ACTIVE: 1.6,
};

export function baselineTdee(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * NEAT_FACTOR[activityLevel]);
}

// MET hodnota tréningu z typu + intenzity (+ jemný modifikátor podľa partie).
function trainingMet(type: string, intensity: string, gymFocus?: string | null): number {
  if (type === "FOOTBALL_TRAINING" || type === "MATCH") {
    if (type === "MATCH") return 10;
    return intensity === "LOW" ? 7 : intensity === "HIGH" ? 10 : 8.5;
  }
  if (type === "GYM") {
    let met = intensity === "LOW" ? 3.5 : intensity === "HIGH" ? 6 : 5;
    const focus = (gymFocus ?? "").toLowerCase();
    if (/leg|noh|full|whole|cel/.test(focus)) met += 0.5; // veľké partie / komplexné
    else if (/arm|ruk|bicep|tricep|ramen|shoulder/.test(focus)) met -= 0.5; // izolácia
    return met;
  }
  return 0; // REST / CUSTOM
}

// NET spálené kcal (odpočítaný pokojový 1 MET, aby sa nedvojpočítal bazál):
// kcal = (MET − 1) × 3.5 × kg ÷ 200 × min   (ACSM / Compendium)
export function netTrainingBurnKcal(p: {
  weightKg: number;
  type: string;
  intensity: string;
  gymFocus?: string | null;
  durationMin: number;
}): number {
  const met = trainingMet(p.type, p.intensity, p.gymFocus);
  if (met <= 1 || p.durationMin <= 0) return 0;
  return Math.round(((met - 1) * 3.5 * p.weightKg) / 200 * p.durationMin);
}

// Úprava cieľových kalórií podľa typu cieľa.
export const GOAL_ADJUSTMENT: Record<GoalType, number> = {
  LOSE_FAT: -0.18, // ~18 % deficit
  GAIN_MUSCLE: 0.1, // ~10 % surplus
  MAINTAIN_PERFORMANCE: 0,
  CUSTOM: 0,
};

export function targetCaloriesFromTdee(tdee: number, goalType: GoalType): number {
  return Math.round(tdee * (1 + GOAL_ADJUSTMENT[goalType]));
}

// Makrá z cieľových kcal a váhy: bielkoviny g/kg, tuky ~27 % kcal, sacharidy zvyšok.
export function macroTargets(p: {
  caloriesKcal: number;
  weightKg: number;
  goalType: GoalType;
}): { proteinG: number; carbsG: number; fatG: number } {
  const proteinPerKg = p.goalType === "LOSE_FAT" ? 2.2 : 2.0;
  const proteinG = Math.round(proteinPerKg * p.weightKg);
  const fatG = Math.round((p.caloriesKcal * 0.27) / 9);
  const remainingKcal = p.caloriesKcal - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(0, Math.round(remainingKcal / 4));
  return { proteinG, carbsG, fatG };
}
