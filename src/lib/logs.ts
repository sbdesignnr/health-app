import { prisma } from "./prisma";

export type MealKey =
  | "BREAKFAST"
  | "MORNING_SNACK"
  | "LUNCH"
  | "AFTERNOON_SNACK"
  | "DINNER";

export const MEAL_KEYS: MealKey[] = [
  "BREAKFAST",
  "MORNING_SNACK",
  "LUNCH",
  "AFTERNOON_SNACK",
  "DINNER",
];

export type LogItemDTO = {
  id: string;
  foodId: string;
  name: string;
  brand: string | null;
  source: "OFF_VERIFIED" | "AI_ESTIMATED" | "CUSTOM";
  mealType: MealKey;
  portionG: number;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type RecentFoodDTO = {
  foodId: string;
  name: string;
  brand: string | null;
  lastPortionG: number;
  caloriesKcal: number; // na 100 g
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingSizeG: number | null;
  source: "OFF_VERIFIED" | "AI_ESTIMATED" | "CUSTOM";
};

const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;

// Snapshot makier pre danú porciu z hodnôt na 100 g.
function snapshot(
  food: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number },
  portionG: number,
) {
  const f = portionG / 100;
  return {
    caloriesKcal: r0(food.caloriesKcal * f),
    proteinG: r1(food.proteinG * f),
    carbsG: r1(food.carbsG * f),
    fatG: r1(food.fatG * f),
  };
}

export async function getDayData(userId: string, from: Date, to: Date) {
  const logs = await prisma.foodLog.findMany({
    where: { userId, loggedAt: { gte: from, lt: to } },
    include: { food: { select: { name: true, brand: true, source: true } } },
    orderBy: { createdAt: "asc" },
  });

  const items: LogItemDTO[] = logs.map((l) => ({
    id: l.id,
    foodId: l.foodId,
    name: l.food.name,
    brand: l.food.brand,
    source: l.food.source as LogItemDTO["source"],
    mealType: l.mealType as MealKey,
    portionG: l.portionG,
    caloriesKcal: l.caloriesKcal,
    proteinG: l.proteinG,
    carbsG: l.carbsG,
    fatG: l.fatG,
  }));

  const totals = items.reduce(
    (a, i) => ({
      caloriesKcal: a.caloriesKcal + i.caloriesKcal,
      proteinG: r1(a.proteinG + i.proteinG),
      carbsG: r1(a.carbsG + i.carbsG),
      fatG: r1(a.fatG + i.fatG),
    }),
    { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  return { items, totals };
}

export async function createLog(
  userId: string,
  input: { foodId: string; mealType: MealKey; portionG: number; loggedAt?: string },
) {
  const food = await prisma.food.findUnique({ where: { id: input.foodId } });
  if (!food) throw new Error("Potravina neexistuje.");
  if (food.userId && food.userId !== userId) throw new Error("Nepovolená potravina.");

  return prisma.foodLog.create({
    data: {
      userId,
      foodId: input.foodId,
      mealType: input.mealType,
      portionG: input.portionG,
      ...snapshot(food, input.portionG),
      loggedAt: input.loggedAt ? new Date(input.loggedAt) : new Date(),
    },
  });
}

export async function updateLog(
  userId: string,
  id: string,
  input: { portionG?: number; mealType?: MealKey },
) {
  const log = await prisma.foodLog.findFirst({
    where: { id, userId },
    include: { food: true },
  });
  if (!log) throw new Error("Záznam neexistuje.");

  const portionG = input.portionG ?? log.portionG;
  return prisma.foodLog.update({
    where: { id },
    data: {
      portionG,
      mealType: input.mealType ?? log.mealType,
      ...snapshot(log.food, portionG),
    },
  });
}

export async function deleteLog(userId: string, id: string) {
  await prisma.foodLog.deleteMany({ where: { id, userId } });
}

// Posledné použité potraviny (dedup podľa foodId) – pre quick-add.
export async function getRecentFoods(userId: string, limit = 10): Promise<RecentFoodDTO[]> {
  const logs = await prisma.foodLog.findMany({
    where: { userId },
    orderBy: { loggedAt: "desc" },
    take: 60,
    include: { food: true },
  });

  const seen = new Set<string>();
  const out: RecentFoodDTO[] = [];
  for (const l of logs) {
    if (seen.has(l.foodId)) continue;
    seen.add(l.foodId);
    out.push({
      foodId: l.foodId,
      name: l.food.name,
      brand: l.food.brand,
      lastPortionG: l.portionG,
      caloriesKcal: l.food.caloriesKcal,
      proteinG: l.food.proteinG,
      carbsG: l.food.carbsG,
      fatG: l.food.fatG,
      servingSizeG: l.food.servingSizeG,
      source: l.food.source as RecentFoodDTO["source"],
    });
    if (out.length >= limit) break;
  }
  return out;
}

export async function createCustomFood(
  userId: string,
  input: {
    name: string;
    brand?: string | null;
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    servingSizeG?: number | null;
  },
) {
  return prisma.food.create({
    data: {
      userId,
      source: "CUSTOM",
      barcode: null,
      name: input.name,
      brand: input.brand ?? null,
      caloriesKcal: input.caloriesKcal,
      proteinG: input.proteinG,
      carbsG: input.carbsG,
      fatG: input.fatG,
      servingSizeG: input.servingSizeG ?? null,
    },
  });
}
