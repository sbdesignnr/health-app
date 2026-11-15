import { prisma } from "./prisma";
import { rowToResult, type FoodResult } from "./food-service";

/**
 * Obľúbené POTRAVINY (nie recepty – tie sú FavoriteMeal).
 * Hviezdička pri potravine v zápise jedla → objaví sa v záložke „Obľúbené“
 * aj s predvolenou porciou, takže sa dá zapísať jedným ťuknutím bez vyhľadávania.
 */
export type FavoriteFoodDTO = {
  favoriteId: string;
  defaultPortionG: number;
  food: FoodResult;
};

const FOOD_SELECT = {
  id: true,
  barcode: true,
  name: true,
  brand: true,
  source: true,
  caloriesKcal: true,
  proteinG: true,
  carbsG: true,
  fatG: true,
  fiberG: true,
  sugarG: true,
  saltG: true,
  servingSizeG: true,
  category: true,
  baseUnit: true,
  servingUnits: true,
  imageUrl: true,
  catalogSlug: true,
} as const;

function fallbackPortion(food: FoodResult): number {
  return Math.round(food.servingSizeG ?? food.servingUnits[0]?.grams ?? 100);
}

export async function listFavoriteFoods(userId: string): Promise<FavoriteFoodDTO[]> {
  const rows = await prisma.favoriteFood.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { food: { select: FOOD_SELECT } },
  });

  return rows.map((r) => {
    const food = rowToResult(r.food);
    return {
      favoriteId: r.id,
      defaultPortionG: Math.round(r.defaultPortionG ?? fallbackPortion(food)),
      food,
    };
  });
}

export async function listFavoriteFoodIds(userId: string): Promise<string[]> {
  const rows = await prisma.favoriteFood.findMany({ where: { userId }, select: { foodId: true } });
  return rows.map((r) => r.foodId);
}

export async function addFavoriteFood(
  userId: string,
  foodId: string,
  defaultPortionG?: number | null,
): Promise<FavoriteFoodDTO | null> {
  const food = await prisma.food.findFirst({
    // vlastná potravina alebo globálna cache (userId = null)
    where: { id: foodId, OR: [{ userId }, { userId: null }] },
    select: FOOD_SELECT,
  });
  if (!food) return null;

  const count = await prisma.favoriteFood.count({ where: { userId } });
  const portion = defaultPortionG != null && defaultPortionG > 0 ? Math.round(defaultPortionG) : null;

  const row = await prisma.favoriteFood.upsert({
    where: { userId_foodId: { userId, foodId } },
    create: { userId, foodId, defaultPortionG: portion, sortOrder: count },
    update: portion != null ? { defaultPortionG: portion } : {},
  });

  const dto = rowToResult(food);
  return {
    favoriteId: row.id,
    defaultPortionG: Math.round(row.defaultPortionG ?? fallbackPortion(dto)),
    food: dto,
  };
}

export async function removeFavoriteFood(userId: string, foodId: string): Promise<void> {
  await prisma.favoriteFood.deleteMany({ where: { userId, foodId } });
}
