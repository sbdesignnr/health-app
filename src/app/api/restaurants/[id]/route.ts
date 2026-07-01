import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { deleteRestaurant, getRestaurant, updateRestaurant } from "@/lib/restaurants";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const restaurant = await getRestaurant(userId, id);
  if (!restaurant) return NextResponse.json({ error: "Nenájdené." }, { status: 404 });
  return NextResponse.json({ restaurant });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const b = await request.json().catch(() => null);
  const data: { name?: string; address?: string | null } = {};
  if (typeof b?.name === "string" && b.name.trim()) data.name = b.name.trim();
  if (b?.address !== undefined) data.address = typeof b.address === "string" && b.address.trim() ? b.address.trim() : null;

  try {
    await updateRestaurant(userId, id, data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Chyba." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteRestaurant(userId, id);
  return NextResponse.json({ ok: true });
}
