import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { addFavoriteFood, listFavoriteFoods, removeFavoriteFood } from "@/lib/food-favorites";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ favorites: await listFavoriteFoods(userId) });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const foodId = typeof b?.foodId === "string" ? b.foodId : "";
  if (!foodId) return NextResponse.json({ error: "Chýba potravina." }, { status: 400 });

  const portion =
    b?.defaultPortionG != null && Number.isFinite(Number(b.defaultPortionG))
      ? Number(b.defaultPortionG)
      : null;

  const favorite = await addFavoriteFood(userId, foodId, portion);
  if (!favorite) return NextResponse.json({ error: "Potravina neexistuje." }, { status: 404 });

  return NextResponse.json({ favorite });
}

export async function DELETE(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const foodId = new URL(request.url).searchParams.get("foodId")?.trim() ?? "";
  if (!foodId) return NextResponse.json({ error: "Chýba potravina." }, { status: 400 });

  await removeFavoriteFood(userId, foodId);
  return NextResponse.json({ ok: true });
}
