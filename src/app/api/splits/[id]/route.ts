import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { addExercise, deleteSplit, updateSplit } from "@/lib/splits";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const b = await request.json().catch(() => null);

  // Pridanie cviku do splitu
  if (b?.action === "addExercise") {
    const name = typeof b?.name === "string" ? b.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Zadaj názov cviku." }, { status: 400 });
    const ok = await addExercise(userId, id, {
      name,
      targetSets: Number.isFinite(Number(b.targetSets)) ? Number(b.targetSets) : null,
      targetReps: typeof b.targetReps === "string" && b.targetReps.trim() ? b.targetReps.trim() : null,
      note: typeof b.note === "string" && b.note.trim() ? b.note.trim() : null,
    });
    if (!ok) return NextResponse.json({ error: "Tréning neexistuje." }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  // Premenovanie splitu
  const patch: { name?: string; note?: string | null } = {};
  if (typeof b?.name === "string" && b.name.trim()) patch.name = b.name.trim();
  if (b?.note !== undefined) patch.note = typeof b.note === "string" && b.note.trim() ? b.note.trim() : null;
  const ok = await updateSplit(userId, id, patch);
  if (!ok) return NextResponse.json({ error: "Tréning neexistuje." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = await deleteSplit(userId, id);
  if (!ok) return NextResponse.json({ error: "Tréning neexistuje." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
