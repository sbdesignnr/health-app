import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { importDefaultFavorites, listFavorites } from "@/lib/favorites";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const imported = await importDefaultFavorites(userId);
  return NextResponse.json({ imported, favorites: await listFavorites(userId) });
}
