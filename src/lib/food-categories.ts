// Kategórie potravín – ikona (emoji) + farba dlaždice. Čisté dáta, bez závislostí,
// aby sa dali použiť v serveri aj v klientovi.

export type FoodCategory =
  | "egg_dairy"
  | "meat"
  | "fish"
  | "grain"
  | "legume"
  | "vegetable"
  | "fruit"
  | "nut"
  | "fat"
  | "sweet"
  | "drink"
  | "sauce"
  | "prepared"
  | "supplement"
  | "other";

export const FOOD_CATEGORY: Record<FoodCategory, { label: string; icon: string; color: string }> = {
  egg_dairy: { label: "Vajcia a mliečne", icon: "🥚", color: "#f4c430" },
  meat: { label: "Mäso a hydina", icon: "🍗", color: "#e0685f" },
  fish: { label: "Ryby a morské plody", icon: "🐟", color: "#4aa8c0" },
  grain: { label: "Obilniny a prílohy", icon: "🌾", color: "#d9a441" },
  legume: { label: "Strukoviny", icon: "🫘", color: "#b07a4a" },
  vegetable: { label: "Zelenina", icon: "🥦", color: "#5bbf72" },
  fruit: { label: "Ovocie", icon: "🍎", color: "#e2795f" },
  nut: { label: "Orechy a semená", icon: "🥜", color: "#c69a5c" },
  fat: { label: "Tuky a oleje", icon: "🫒", color: "#9bb24a" },
  sweet: { label: "Sladké", icon: "🍫", color: "#b3785a" },
  drink: { label: "Nápoje", icon: "🥤", color: "#6d9fd0" },
  sauce: { label: "Omáčky a koreniny", icon: "🧂", color: "#9aa0a8" },
  prepared: { label: "Hotové jedlá", icon: "🍽️", color: "#cf9f52" },
  supplement: { label: "Doplnky výživy", icon: "💊", color: "#8f7fd0" },
  other: { label: "Ostatné", icon: "🍴", color: "#9aa0a8" },
};

export function categoryMeta(cat: string | null | undefined): { icon: string; color: string; label: string } {
  const c = (cat as FoodCategory) in FOOD_CATEGORY ? (cat as FoodCategory) : "other";
  return FOOD_CATEGORY[c];
}
