import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { deleteFavorite, updateFavorite, type FavoriteInput } from "@/lib/favorites";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: "Neplatné dáta." }, { status: 400 });

  const numOrNull = (v: unknown) => (v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);
  const patch: Partial<FavoriteInput> = {};
  if (typeof b.name === "string" && b.name.trim()) patch.name = b.name.trim().slice(0, 120);
  if (Array.isArray(b.mealTypes)) patch.mealTypes = (b.mealTypes as string[]).filter((x) => typeof x === "string");
  if (Array.isArray(b.ingredients)) patch.ingredients = b.ingredients as FavoriteInput["ingredients"];
  if (Array.isArray(b.recipe)) patch.recipe = b.recipe as string[];
  if (b.portionG !== undefined) patch.portionG = numOrNull(b.portionG);
  if (b.caloriesKcal !== undefined) patch.caloriesKcal = Number(b.caloriesKcal) || 0;
  if (b.proteinG !== undefined) patch.proteinG = Number(b.proteinG) || 0;
  if (b.carbsG !== undefined) patch.carbsG = Number(b.carbsG) || 0;
  if (b.fatG !== undefined) patch.fatG = Number(b.fatG) || 0;
  if (b.prepMinutes !== undefined) patch.prepMinutes = numOrNull(b.prepMinutes);
  if (b.priceEur !== undefined) patch.priceEur = numOrNull(b.priceEur);
  if (b.maxPerWeek !== undefined) patch.maxPerWeek = numOrNull(b.maxPerWeek);
  if (b.note !== undefined) patch.note = typeof b.note === "string" && b.note.trim() ? b.note.trim() : null;
  if (b.active !== undefined) patch.active = !!b.active;

  const favorite = await updateFavorite(userId, id, patch);
  if (!favorite) return NextResponse.json({ error: "Jedlo neexistuje." }, { status: 404 });
  return NextResponse.json({ favorite });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await deleteFavorite(userId, id);
  return NextResponse.json({ ok: true });
}
