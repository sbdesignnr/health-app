import { prisma } from "./prisma";
import {
  fetchProductByBarcode,
  searchProducts,
  isComplete,
  type NormalizedFood,
} from "./openfoodfacts";
import { estimateMacros } from "./food-ai";

export type FoodSourceLabel = "OFF_VERIFIED" | "AI_ESTIMATED" | "CUSTOM";

// Výsledok pre UI – z cache (id != null) alebo prechodný z hľadania (id = null).
export type FoodResult = {
  id: string | null;
  barcode: string | null;
  name: string;
  brand: string | null;
  source: FoodSourceLabel;
  complete: boolean; // kcal + 3 makrá prítomné
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  saltG: number | null;
  servingSizeG: number | null;
};

type FoodRow = {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  source: FoodSourceLabel;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  sugarG: number | null;
  saltG: number | null;
  servingSizeG: number | null;
};

function rowToResult(r: FoodRow): FoodResult {
  return {
    id: r.id,
    barcode: r.barcode,
    name: r.name,
    brand: r.brand,
    source: r.source,
    complete: true, // do cache ukladáme len kompletné záznamy
    caloriesKcal: r.caloriesKcal,
    proteinG: r.proteinG,
    carbsG: r.carbsG,
    fatG: r.fatG,
    fiberG: r.fiberG,
    sugarG: r.sugarG,
    saltG: r.saltG,
    servingSizeG: r.servingSizeG,
  };
}

function normalizedToTransient(f: NormalizedFood): FoodResult {
  return {
    id: null,
    barcode: f.barcode,
    name: f.name,
    brand: f.brand,
    source: "OFF_VERIFIED",
    complete: isComplete(f),
    caloriesKcal: f.caloriesKcal,
    proteinG: f.proteinG,
    carbsG: f.carbsG,
    fatG: f.fatG,
    fiberG: f.fiberG,
    sugarG: f.sugarG,
    saltG: f.saltG,
    servingSizeG: f.servingSizeG,
  };
}

// Uloží/aktualizuje globálny cache záznam (userId = null). Prisma beží mimo RLS.
async function cacheGlobalFood(
  f: NormalizedFood,
  source: "OFF_VERIFIED" | "AI_ESTIMATED",
): Promise<FoodResult> {
  const data = {
    name: f.name,
    brand: f.brand,
    barcode: f.barcode,
    source,
    caloriesKcal: f.caloriesKcal ?? 0,
    proteinG: f.proteinG ?? 0,
    carbsG: f.carbsG ?? 0,
    fatG: f.fatG ?? 0,
    fiberG: f.fiberG,
    sugarG: f.sugarG,
    saltG: f.saltG,
    servingSizeG: f.servingSizeG,
  };

  const existing = f.barcode
    ? await prisma.food.findFirst({ where: { barcode: f.barcode, userId: null } })
    : null;

  const row = existing
    ? await prisma.food.update({ where: { id: existing.id }, data })
    : await prisma.food.create({ data: { ...data, userId: null } });

  return rowToResult(row as FoodRow);
}

/**
 * Vyhľadanie podľa čiarového kódu: cache → Open Food Facts → AI doplnenie.
 * Vracia null, ak OFF produkt vôbec nepozná (UI ponúkne manuálne pridanie).
 */
export async function resolveByBarcode(barcode: string): Promise<FoodResult | null> {
  // 1) cache
  const cached = await prisma.food.findFirst({ where: { barcode, userId: null } });
  if (cached) return rowToResult(cached as FoodRow);

  // 2) Open Food Facts
  const off = await fetchProductByBarcode(barcode);
  if (!off) return null;

  // 3a) kompletné dáta → ulož ako overené
  if (isComplete(off)) return cacheGlobalFood(off, "OFF_VERIFIED");

  // 3b) produkt existuje, ale chýbajú makrá → doplň AI (poznáme názov)
  const est = await estimateMacros({ name: off.name, brand: off.brand });
  const merged: NormalizedFood = {
    ...off,
    caloriesKcal: off.caloriesKcal ?? est.caloriesKcal,
    proteinG: off.proteinG ?? est.proteinG,
    carbsG: off.carbsG ?? est.carbsG,
    fatG: off.fatG ?? est.fatG,
  };
  return cacheGlobalFood(merged, "AI_ESTIMATED");
}

/**
 * Textové vyhľadávanie. Vracia prechodné výsledky (necachujeme každý hit);
 * cache sa naplní až pri výbere konkrétneho produktu cez resolveByBarcode().
 */
export async function searchByText(query: string, pageSize = 20): Promise<FoodResult[]> {
  const hits = await searchProducts(query, pageSize);
  return hits.map(normalizedToTransient);
}
