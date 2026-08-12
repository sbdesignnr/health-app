import { prisma } from "./prisma";
import {
  fetchProductByBarcode,
  searchProducts,
  isComplete,
  type NormalizedFood,
} from "./openfoodfacts";
import { estimateMacros } from "./food-ai";
import { FOOD_CATALOG, findCatalogBySlug, searchCatalog, type CatalogFood } from "./food-catalog";

export type FoodSourceLabel = "OFF_VERIFIED" | "AI_ESTIMATED" | "CUSTOM" | "CURATED";

export type ServingUnit = { label: string; grams: number };

// Výsledok pre UI – z cache/katalógu (id != null) alebo prechodný z hľadania.
export type FoodResult = {
  id: string | null;
  catalogSlug: string | null; // ak ide o kurátorovanú potravinu (id môže byť null)
  barcode: string | null;
  name: string;
  brand: string | null;
  source: FoodSourceLabel;
  complete: boolean;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  saltG: number | null;
  servingSizeG: number | null;
  category: string | null;
  baseUnit: string; // "g" | "ml"
  servingUnits: ServingUnit[];
  imageUrl: string | null;
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
  category: string | null;
  baseUnit: string | null;
  servingUnits: unknown;
  imageUrl: string | null;
  catalogSlug: string | null;
};

function rowToResult(r: FoodRow): FoodResult {
  return {
    id: r.id,
    catalogSlug: r.catalogSlug,
    barcode: r.barcode,
    name: r.name,
    brand: r.brand,
    source: r.source,
    complete: true,
    caloriesKcal: r.caloriesKcal,
    proteinG: r.proteinG,
    carbsG: r.carbsG,
    fatG: r.fatG,
    fiberG: r.fiberG,
    sugarG: r.sugarG,
    saltG: r.saltG,
    servingSizeG: r.servingSizeG,
    category: r.category,
    baseUnit: r.baseUnit ?? "g",
    servingUnits: Array.isArray(r.servingUnits) ? (r.servingUnits as ServingUnit[]) : [],
    imageUrl: r.imageUrl,
  };
}

function catalogToResult(f: CatalogFood): FoodResult {
  return {
    id: null,
    catalogSlug: f.slug,
    barcode: null,
    name: f.name,
    brand: null,
    source: "CURATED",
    complete: true,
    caloriesKcal: f.kcal,
    proteinG: f.protein,
    carbsG: f.carbs,
    fatG: f.fat,
    fiberG: f.fiber ?? null,
    sugarG: f.sugar ?? null,
    saltG: null,
    servingSizeG: f.units?.[0]?.grams ?? null,
    category: f.category,
    baseUnit: f.base,
    servingUnits: f.units ?? [],
    imageUrl: null,
  };
}

function normalizedToTransient(f: NormalizedFood): FoodResult {
  return {
    id: null,
    catalogSlug: null,
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
    category: null,
    baseUnit: "g",
    servingUnits: [],
    imageUrl: f.imageUrl,
  };
}

// Uloží/aktualizuje globálny cache záznam (userId = null).
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
    imageUrl: f.imageUrl,
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
 * Kurátorovaná potravina → globálny Food záznam (upsert podľa catalogSlug).
 * Volané pri výbere z hľadania, aby sme mali foodId pre FoodLog.
 */
export async function resolveCatalogFood(slug: string): Promise<FoodResult | null> {
  const cat = findCatalogBySlug(slug);
  if (!cat) return null;

  const data = {
    name: cat.name,
    brand: null,
    source: "CURATED" as const,
    caloriesKcal: cat.kcal,
    proteinG: cat.protein,
    carbsG: cat.carbs,
    fatG: cat.fat,
    fiberG: cat.fiber ?? null,
    sugarG: cat.sugar ?? null,
    saltG: null,
    servingSizeG: cat.units?.[0]?.grams ?? null,
    category: cat.category,
    baseUnit: cat.base,
    servingUnits: cat.units ?? [],
  };

  const row = await prisma.food.upsert({
    where: { catalogSlug: slug },
    // aktualizuj makrá, ak sme katalóg medzičasom spresnili
    update: data,
    create: { ...data, catalogSlug: slug, userId: null },
  });
  return rowToResult(row as FoodRow);
}

/**
 * Vyhľadanie podľa čiarového kódu: cache → Open Food Facts → AI doplnenie.
 */
export async function resolveByBarcode(barcode: string): Promise<FoodResult | null> {
  const cached = await prisma.food.findFirst({ where: { barcode, userId: null } });
  if (cached) return rowToResult(cached as FoodRow);

  const off = await fetchProductByBarcode(barcode);
  if (!off) return null;

  if (isComplete(off)) return cacheGlobalFood(off, "OFF_VERIFIED");

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

function customRowToResult(r: FoodRow): FoodResult {
  return { ...rowToResult(r), source: "CUSTOM" };
}

/**
 * LOKÁLNE vyhľadávanie (okamžité, bez siete):
 *   1) kurátorovaný katalóg (aj bez diakritiky)
 *   2) vlastné potraviny používateľa
 */
export async function searchLocal(query: string, userId: string | null = null): Promise<FoodResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const catalog = searchCatalog(q, 12).map(catalogToResult);

  const customRows = userId
    ? ((await prisma.food.findMany({
        where: { userId, name: { contains: q, mode: "insensitive" } },
        take: 8,
        orderBy: { updatedAt: "desc" },
      })) as FoodRow[])
    : [];
  const customs = customRows.map(customRowToResult);

  return dedupe([...catalog, ...customs]);
}

/** Značkové/balené produkty z Open Food Facts (sieť). Dopĺňajúce – volané ako druhá vlna. */
export async function searchOff(query: string, pageSize = 20): Promise<FoodResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const hits = await searchProducts(q, pageSize);
    return dedupe(hits.map(normalizedToTransient));
  } catch {
    return [];
  }
}

function dedupe(list: FoodResult[]): FoodResult[] {
  const seen = new Set<string>();
  const out: FoodResult[] = [];
  for (const r of list) {
    const key = `${r.name.toLowerCase()}|${r.brand?.toLowerCase() ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/** Kombinované (lokálne + OFF) – zachované pre iných volajúcich. */
export async function searchByText(
  query: string,
  userId: string | null = null,
  pageSize = 20,
): Promise<FoodResult[]> {
  const [local, off] = await Promise.all([searchLocal(query, userId), searchOff(query, pageSize)]);
  return dedupe([...local, ...off]).slice(0, 30);
}

// Vráti počet potravín v katalógu (diagnostika).
export function catalogSize(): number {
  return FOOD_CATALOG.length;
}
