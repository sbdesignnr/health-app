import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { createCombo, deleteCombo, listCombos, logCombo } from "@/lib/food-combos";
import { MEAL_KEYS, type MealKey } from "@/lib/logs";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ combos: await listCombos(userId) });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);

  // Zápis celého obľúbeného jedla do dňa
  if (b?.action === "log") {
    const id = typeof b?.id === "string" ? b.id : "";
    const mealType = b?.mealType;
    if (!id || !MEAL_KEYS.includes(mealType)) {
      return NextResponse.json({ error: "Neplatné dáta." }, { status: 400 });
    }
    try {
      const count = await logCombo(
        userId,
        id,
        mealType as MealKey,
        typeof b?.loggedAt === "string" ? b.loggedAt : undefined,
      );
      return NextResponse.json({ ok: true, count });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Zápis zlyhal." },
        { status: 400 },
      );
    }
  }

  // Vytvorenie nového obľúbeného jedla
  const name = typeof b?.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Zadaj názov jedla." }, { status: 400 });

  const items = Array.isArray(b?.items)
    ? (b.items as unknown[])
        .map((x) => x as { foodId?: unknown; portionG?: unknown })
        .filter((x) => typeof x.foodId === "string" && Number(x.portionG) > 0)
        .map((x) => ({ foodId: x.foodId as string, portionG: Number(x.portionG) }))
    : [];
  if (items.length === 0) return NextResponse.json({ error: "Jedlo nemá žiadne položky." }, { status: 400 });

  const mealType = MEAL_KEYS.includes(b?.mealType) ? (b.mealType as MealKey) : null;
  const combo = await createCombo(userId, { name, mealType, items });
  if (!combo) return NextResponse.json({ error: "Potraviny sa nepodarilo načítať." }, { status: 400 });

  return NextResponse.json({ combo });
}

export async function DELETE(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) return NextResponse.json({ error: "Chýba id." }, { status: 400 });

  await deleteCombo(userId, id);
  return NextResponse.json({ ok: true });
}
