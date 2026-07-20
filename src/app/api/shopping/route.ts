import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { createList, getLatestList, toggleItem } from "@/lib/shopping";

export const maxDuration = 300;

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ list: await getLatestList(userId) });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const from = typeof b?.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.from) ? b.from : undefined;
  const days = Number.isFinite(Number(b?.days)) ? Number(b.days) : 7;

  try {
    const list = await createList(userId, from, days);
    return NextResponse.json({ list });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Nepodarilo sa vygenerovať nákupný zoznam.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const id = typeof b?.id === "string" ? b.id : null;
  const groupIndex = Number(b?.groupIndex);
  const itemIndex = Number(b?.itemIndex);
  if (!id || !Number.isInteger(groupIndex) || !Number.isInteger(itemIndex)) {
    return NextResponse.json({ error: "Neplatná položka." }, { status: 400 });
  }

  const list = await toggleItem(userId, id, groupIndex, itemIndex, b?.checked === true);
  if (!list) return NextResponse.json({ error: "Zoznam sa nenašiel." }, { status: 404 });
  return NextResponse.json({ list });
}
