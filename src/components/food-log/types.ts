export type MealKey =
  | "BREAKFAST"
  | "MORNING_SNACK"
  | "LUNCH"
  | "AFTERNOON_SNACK"
  | "DINNER";

export const MEALS: { key: MealKey; label: string }[] = [
  { key: "BREAKFAST", label: "Raňajky" },
  { key: "MORNING_SNACK", label: "Desiata" },
  { key: "LUNCH", label: "Obed" },
  { key: "AFTERNOON_SNACK", label: "Olovrant" },
  { key: "DINNER", label: "Večera" },
];

export type FoodSource = "OFF_VERIFIED" | "AI_ESTIMATED" | "CUSTOM" | "CURATED";

export type ServingUnit = { label: string; grams: number };

export type LogItem = {
  id: string;
  foodId: string;
  name: string;
  brand: string | null;
  source: FoodSource;
  category: string | null;
  mealType: MealKey;
  portionG: number;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type Targets = {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  isDefault: boolean;
};

export type Totals = {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type RecentFood = {
  foodId: string;
  name: string;
  brand: string | null;
  lastPortionG: number;
  caloriesKcal: number; // na 100 g
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingSizeG: number | null;
  source: FoodSource;
  category: string | null;
  baseUnit: string;
  servingUnits: ServingUnit[];
};

export type DayData = {
  items: LogItem[];
  totals: Totals;
  targets: Targets;
  recent: RecentFood[];
};

// Tvar z /api/foods/search, /api/foods/barcode, /api/foods/custom (makrá na 100 g).
export type FoodResult = {
  id: string | null;
  catalogSlug: string | null;
  barcode: string | null;
  name: string;
  brand: string | null;
  source: FoodSource;
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
  baseUnit: string;
  servingUnits: ServingUnit[];
  imageUrl: string | null;
};
