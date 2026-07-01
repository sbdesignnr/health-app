import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { deleteMenuItem, parseMenuItemInput, updateMenuItem } from "@/lib/restaurants";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const input = parseMenuItemInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Neplatná položka." }, { status: 400 });

  try {
    const restaurant = await updateMenuItem(userId, itemId, input);
    return NextResponse.json({ restaurant });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Chyba." }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, itemId } = await params;
  const restaurant = await deleteMenuItem(userId, id, itemId);
  return NextResponse.json({ restaurant });
}
