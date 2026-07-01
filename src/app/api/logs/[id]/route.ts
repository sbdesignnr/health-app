import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { deleteLog, updateLog, MEAL_KEYS, type MealKey } from "@/lib/logs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const input: { portionG?: number; mealType?: MealKey } = {};
  if (typeof body?.portionG === "number" && body.portionG > 0) input.portionG = body.portionG;
  if (MEAL_KEYS.includes(body?.mealType)) input.mealType = body.mealType as MealKey;

  try {
    const log = await updateLog(userId, id, input);
    return NextResponse.json({ log });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Úprava zlyhala." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await deleteLog(userId, id);
  return NextResponse.json({ ok: true });
}
