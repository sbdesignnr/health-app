import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { logPlanItem } from "@/lib/meal-plans";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  if (typeof b?.itemId !== "string") {
    return NextResponse.json({ error: "Chýba itemId." }, { status: 400 });
  }

  try {
    await logPlanItem(userId, b.itemId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Pridanie zlyhalo." },
      { status: 400 },
    );
  }
}
