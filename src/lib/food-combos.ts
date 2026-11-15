import { prisma } from "./prisma";
import { createLog, type MealKey } from "./logs";

/**
 * Obľúbené JEDLÁ zložené z viacerých potravín (napr. „Ovsené vločky + banán + proteín").
 * Uloží sa presná gramáž každej položky a celé jedlo sa potom zapíše jedným ťuknutím.
 * Líši sa od FavoriteMeal (to sú AI recepty pre jedálniček) aj od FavoriteFood (jedna potravina).
 */
export type FoodComboItemDTO = {
  foodId: string;
  name: string;
  brand: string | null;
  category: string | null;
  portionG: number;
  caloriesKcal: number; // už prepočítané na porciu
};

export type FoodComboDTO = {
  id: string;
  name: string;
  mealType: MealKey | null;
  items: FoodComboItemDTO[];
  totals: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number };
};

type ComboRow = {
  id: string;
  name: string;
  mealType: string | null;
  items: {
    foodId: string;
    portionG: number;
    sortOrder: number;
    food: {
      name: string;
      brand: string | null;
      category: string | null;
      caloriesKcal: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
    };
  }[];
};

function toDTO(c: ComboRow): FoodComboDTO {
  const items = c.items
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((i) => ({
      foodId: i.foodId,
      name: i.food.name,
      brand: i.food.brand,
      category: i.food.category,
      portionG: Math.round(i.portionG),
      caloriesKcal: Math.round((i.food.caloriesKcal * i.portionG) / 100),
    }));

  const totals = c.items.reduce(
    (acc, i) => {
      const f = i.portionG / 100;
      return {
        caloriesKcal: acc.caloriesKcal + i.food.caloriesKcal * f,
        proteinG: acc.proteinG + i.food.proteinG * f,
        carbsG: acc.carbsG + i.food.carbsG * f,
        fatG: acc.fatG + i.food.fatG * f,
      };
    },
    { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  return {
    id: c.id,
    name: c.name,
    mealType: (c.mealType as MealKey | null) ?? null,
    items,
    totals: {
      caloriesKcal: Math.round(totals.caloriesKcal),
      proteinG: Math.round(totals.proteinG),
      carbsG: Math.round(totals.carbsG),
      fatG: Math.round(totals.fatG),
    },
  };
}

const INCLUDE_ITEMS = {
  items: {
    include: {
      food: {
        select: {
          name: true,
          brand: true,
          category: true,
          caloriesKcal: true,
          proteinG: true,
          carbsG: true,
          fatG: true,
        },
      },
    },
  },
} as const;

export async function listCombos(userId: string): Promise<FoodComboDTO[]> {
  const rows = await prisma.foodCombo.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: INCLUDE_ITEMS,
  });
  return (rows as ComboRow[]).map(toDTO);
}

export async function createCombo(
  userId: string,
  input: { name: string; mealType?: MealKey | null; items: { foodId: string; portionG: number }[] },
): Promise<FoodComboDTO | null> {
  const ids = [...new Set(input.items.map((i) => i.foodId))];
  if (ids.length === 0) return null;

  // Len vlastné potraviny alebo globálna cache.
  const allowed = await prisma.food.findMany({
    where: { id: { in: ids }, OR: [{ userId }, { userId: null }] },
    select: { id: true },
  });
  const ok = new Set(allowed.map((f) => f.id));
  const items = input.items.filter((i) => ok.has(i.foodId) && i.portionG > 0);
  if (items.length === 0) return null;

  const count = await prisma.foodCombo.count({ where: { userId } });
  const created = await prisma.foodCombo.create({
    data: {
      userId,
      name: input.name.slice(0, 80),
      mealType: input.mealType ?? null,
      sortOrder: count,
      items: {
        create: items.map((i, idx) => ({
          foodId: i.foodId,
          portionG: Math.round(i.portionG),
          sortOrder: idx,
        })),
      },
    },
    include: INCLUDE_ITEMS,
  });
  return toDTO(created as ComboRow);
}

export async function deleteCombo(userId: string, id: string): Promise<void> {
  await prisma.foodCombo.deleteMany({ where: { id, userId } });
}

/** Zapíše celé obľúbené jedlo do daného jedla dňa. Vráti počet zapísaných položiek. */
export async function logCombo(
  userId: string,
  comboId: string,
  mealType: MealKey,
  loggedAt?: string,
): Promise<number> {
  const combo = await prisma.foodCombo.findFirst({
    where: { id: comboId, userId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!combo) throw new Error("Jedlo neexistuje.");

  let n = 0;
  for (const item of combo.items) {
    await createLog(userId, { foodId: item.foodId, mealType, portionG: item.portionG, loggedAt });
    n++;
  }
  return n;
}
