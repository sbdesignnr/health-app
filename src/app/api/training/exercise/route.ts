import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { renameExercise } from "@/lib/training";

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const exerciseId = typeof b?.exerciseId === "string" ? b.exerciseId : "";
  const name = typeof b?.name === "string" ? b.name.trim() : "";
  if (!exerciseId || !name) {
    return NextResponse.json({ error: "Chýba cvik alebo názov." }, { status: 400 });
  }

  const ok = await renameExercise(userId, exerciseId, name.slice(0, 80));
  if (!ok) return NextResponse.json({ error: "Cvik neexistuje." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
