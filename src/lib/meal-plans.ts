import { prisma } from "./prisma";
import {
  generatePlan,
  generateSingleMeal,
  type AiIngredient,
  type AiMealItem,
  type AiSupplement,
} from "./meal-plan-ai";

type MealTypeLit = "BREAKFAST" | "MORNING_SNACK" | "LUNCH" | "AFTERNOON_SNACK" | "DINNER";

const MEAL_ORDER: Record<string, number> = {
  BREAKFAST: 0,
  MORNING_SNACK: 1,
  LUNCH: 2,
  AFTERNOON_SNACK: 3,
  DINNER: 4,
};

const r1 = (n: number) => Math.round(n * 10) / 10;

export type PlanItemDTO = {
  id: string;
  mealType: string;
  name: string;
  description: string | null;
  timeOfDay: string | null;
  ingredients: AiIngredient[] | null;
  recipe: string[] | null;
  portionG: number | null;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sortOrder: number;
};

export type PlanDTO = {
  id: string;
  date: string;
  model: string;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  dailyTip: string | null;
  supplementPlan: AiSupplement[] | null;
  items: PlanItemDTO[];
};

type PlanRow = {
  id: string;
  date: Date;
  model: string;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  dailyTip: string | null;
  supplementPlan: unknown;
  items: {
    id: string;
    mealType: string;
    name: string;
    description: string | null;
    timeOfDay: string | null;
    ingredients: unknown;
    recipe: unknown;
    portionG: number | null;
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    sortOrder: number;
  }[];
};

function toDTO(plan: PlanRow): PlanDTO {
  return {
    id: plan.id,
    date: plan.date.toISOString().slice(0, 10),
    model: plan.model,
    targetCalories: plan.targetCalories,
    targetProteinG: plan.targetProteinG,
    targetCarbsG: plan.targetCarbsG,
    targetFatG: plan.targetFatG,
    dailyTip: plan.dailyTip,
    supplementPlan: (plan.supplementPlan as AiSupplement[] | null) ?? null,
    items: plan.items
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({
        id: i.id,
        mealType: i.mealType,
        name: i.name,
        description: i.description,
        timeOfDay: i.timeOfDay,
        ingredients: (i.ingredients as AiIngredient[] | null) ?? null,
        recipe: (i.recipe as string[] | null) ?? null,
        portionG: i.portionG,
        caloriesKcal: i.caloriesKcal,
        proteinG: i.proteinG,
        carbsG: i.carbsG,
        fatG: i.fatG,
        sortOrder: i.sortOrder,
      })),
  };
}

export async function getPlan(userId: string, dateStr: string): Promise<PlanDTO | null> {
  const plan = await prisma.mealPlan.findFirst({
    where: { userId, date: new Date(`${dateStr}T00:00:00Z`) },
    include: { items: true },
  });
  return plan ? toDTO(plan as PlanRow) : null;
}

export async function generateAndSave(userId: string, dateStr: string): Promise<PlanDTO> {
  const { items, dailyTip, supplementPlan, context, model, targets } = await generatePlan(userId, dateStr);
  const date = new Date(`${dateStr}T00:00:00Z`);

  await prisma.$transaction(async (tx) => {
    await tx.mealPlan.deleteMany({ where: { userId, date } });
    await tx.mealPlan.create({
      data: {
        userId,
        date,
        model,
        targetCalories: targets.caloriesKcal,
        targetProteinG: targets.proteinG,
        targetCarbsG: targets.carbsG,
        targetFatG: targets.fatG,
        status: "GENERATED",
        context: { prompt: context },
        dailyTip,
        supplementPlan,
        items: {
          create: items.map((m, i) => ({
            mealType: m.mealType as MealTypeLit,
            name: m.name,
            description: m.description,
            timeOfDay: m.timeOfDay,
            ingredients: m.ingredients,
            recipe: m.recipe,
            portionG: m.portionG,
            caloriesKcal: m.caloriesKcal,
            proteinG: m.proteinG,
            carbsG: m.carbsG,
            fatG: m.fatG,
            sortOrder: MEAL_ORDER[m.mealType] ?? i,
          })),
        },
      },
    });
  });

  const plan = await getPlan(userId, dateStr);
  if (!plan) throw new Error("Plán sa nepodarilo načítať.");
  return plan;
}

export async function swapItem(userId: string, itemId: string): Promise<PlanItemDTO> {
  const item = await prisma.mealPlanItem.findFirst({
    where: { id: itemId },
    include: { mealPlan: { include: { items: true } } },
  });
  if (!item || item.mealPlan.userId !== userId) throw new Error("Položka neexistuje.");

  const dateStr = item.mealPlan.date.toISOString().slice(0, 10);
  const others: AiMealItem[] = item.mealPlan.items
    .filter((i) => i.id !== itemId)
    .map((i) => ({
      mealType: i.mealType,
      name: i.name,
      description: i.description ?? "",
      timeOfDay: i.timeOfDay ?? "",
      ingredients: (i.ingredients as AiIngredient[] | null) ?? [],
      recipe: (i.recipe as string[] | null) ?? [],
      portionG: i.portionG ?? 0,
      caloriesKcal: i.caloriesKcal,
      proteinG: i.proteinG,
      carbsG: i.carbsG,
      fatG: i.fatG,
    }));

  const replacement = await generateSingleMeal(userId, dateStr, item.mealType, others, item.name);

  const updated = await prisma.mealPlanItem.update({
    where: { id: itemId },
    data: {
      name: replacement.name,
      description: replacement.description,
      timeOfDay: replacement.timeOfDay,
      ingredients: replacement.ingredients,
      recipe: replacement.recipe,
      portionG: replacement.portionG,
      caloriesKcal: replacement.caloriesKcal,
      proteinG: replacement.proteinG,
      carbsG: replacement.carbsG,
      fatG: replacement.fatG,
    },
  });

  return {
    id: updated.id,
    mealType: updated.mealType,
    name: updated.name,
    description: updated.description,
    timeOfDay: updated.timeOfDay,
    ingredients: (updated.ingredients as AiIngredient[] | null) ?? null,
    recipe: (updated.recipe as string[] | null) ?? null,
    portionG: updated.portionG,
    caloriesKcal: updated.caloriesKcal,
    proteinG: updated.proteinG,
    carbsG: updated.carbsG,
    fatG: updated.fatG,
    sortOrder: updated.sortOrder,
  };
}

// Pridá jedlo z plánu do food logu (vytvorí AI potravinu + záznam → ráta sa na Dnes).
export async function logPlanItem(userId: string, itemId: string) {
  const item = await prisma.mealPlanItem.findFirst({
    where: { id: itemId },
    include: { mealPlan: true },
  });
  if (!item || item.mealPlan.userId !== userId) throw new Error("Položka neexistuje.");

  const portionG = item.portionG ?? 100;
  const per100 = 100 / portionG;

  const food = await prisma.food.create({
    data: {
      userId,
      source: "AI_ESTIMATED",
      barcode: null,
      name: item.name,
      caloriesKcal: r1(item.caloriesKcal * per100),
      proteinG: r1(item.proteinG * per100),
      carbsG: r1(item.carbsG * per100),
      fatG: r1(item.fatG * per100),
      servingSizeG: portionG,
    },
  });

  return prisma.foodLog.create({
    data: {
      userId,
      foodId: food.id,
      mealType: item.mealType,
      portionG,
      caloriesKcal: Math.round(item.caloriesKcal),
      proteinG: r1(item.proteinG),
      carbsG: r1(item.carbsG),
      fatG: r1(item.fatG),
      loggedAt: new Date(),
    },
  });
}
