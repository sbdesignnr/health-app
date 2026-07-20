import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { createFavorite, listFavorites, type FavoriteInput } from "@/lib/favorites";

function parseInput(b: Record<string, unknown> | null): FavoriteInput | null {
  if (!b) return null;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return null;
  const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const numOrNull = (v: unknown) => (v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);
  return {
    name: name.slice(0, 120),
    mealTypes: Array.isArray(b.mealTypes) ? (b.mealTypes as string[]).filter((x) => typeof x === "string") : [],
    ingredients: Array.isArray(b.ingredients) ? (b.ingredients as FavoriteInput["ingredients"]) : null,
    recipe: Array.isArray(b.recipe) ? (b.recipe as string[]) : null,
    portionG: numOrNull(b.portionG),
    caloriesKcal: num(b.caloriesKcal),
    proteinG: num(b.proteinG),
    carbsG: num(b.carbsG),
    fatG: num(b.fatG),
    prepMinutes: numOrNull(b.prepMinutes),
    priceEur: numOrNull(b.priceEur),
    maxPerWeek: numOrNull(b.maxPerWeek),
    note: typeof b.note === "string" && b.note.trim() ? b.note.trim().slice(0, 300) : null,
    active: b.active === false ? false : true,
  };
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ favorites: await listFavorites(userId) });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = parseInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Chýba názov jedla." }, { status: 400 });

  const favorite = await createFavorite(userId, input);
  return NextResponse.json({ favorite });
}
