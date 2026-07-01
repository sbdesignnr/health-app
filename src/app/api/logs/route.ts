import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { createLog, getDayData, getRecentFoods, MEAL_KEYS, type MealKey } from "@/lib/logs";
import { getDailyTargets } from "@/lib/goals";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const from = new Date(sp.get("from") ?? "");
  const to = new Date(sp.get("to") ?? "");
  const date = sp.get("date") ?? undefined; // YYYY-MM-DD pre denný tréningový výdaj
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Neplatný rozsah dátumu." }, { status: 400 });
  }

  const [day, targets, recent] = await Promise.all([
    getDayData(userId, from, to),
    getDailyTargets(userId, date),
    getRecentFoods(userId),
  ]);

  return NextResponse.json({ items: day.items, totals: day.totals, targets, recent });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const foodId = body?.foodId;
  const mealType = body?.mealType;
  const portionG = body?.portionG;
  const loggedAt = body?.loggedAt;

  if (
    typeof foodId !== "string" ||
    !MEAL_KEYS.includes(mealType) ||
    typeof portionG !== "number" ||
    !(portionG > 0)
  ) {
    return NextResponse.json({ error: "Neplatné dáta." }, { status: 400 });
  }

  try {
    const log = await createLog(userId, {
      foodId,
      mealType: mealType as MealKey,
      portionG,
      loggedAt: typeof loggedAt === "string" ? loggedAt : undefined,
    });
    return NextResponse.json({ log });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Zápis zlyhal." },
      { status: 400 },
    );
  }
}
