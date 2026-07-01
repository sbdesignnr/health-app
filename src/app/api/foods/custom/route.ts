import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { createCustomFood } from "@/lib/logs";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const name = typeof b?.name === "string" ? b.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Názov je povinný." }, { status: 400 });
  }

  for (const k of ["caloriesKcal", "proteinG", "carbsG", "fatG"] as const) {
    if (typeof b?.[k] !== "number" || b[k] < 0) {
      return NextResponse.json({ error: `Neplatná hodnota: ${k}` }, { status: 400 });
    }
  }

  const food = await createCustomFood(userId, {
    name,
    brand: typeof b.brand === "string" && b.brand.trim() ? b.brand.trim() : null,
    caloriesKcal: b.caloriesKcal,
    proteinG: b.proteinG,
    carbsG: b.carbsG,
    fatG: b.fatG,
    servingSizeG: typeof b.servingSizeG === "number" ? b.servingSizeG : null,
  });

  return NextResponse.json({
    food: {
      id: food.id,
      barcode: null,
      name: food.name,
      brand: food.brand,
      source: "CUSTOM",
      complete: true,
      caloriesKcal: food.caloriesKcal,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
      fiberG: food.fiberG,
      sugarG: food.sugarG,
      saltG: food.saltG,
      servingSizeG: food.servingSizeG,
    },
  });
}
