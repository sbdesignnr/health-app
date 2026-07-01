import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { addMenuItem, parseMenuItemInput } from "@/lib/restaurants";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const input = parseMenuItemInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Neplatná položka." }, { status: 400 });

  try {
    const restaurant = await addMenuItem(userId, id, input);
    return NextResponse.json({ restaurant });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Chyba." }, { status: 400 });
  }
}
