import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { deleteExercise, updateExercise } from "@/lib/splits";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const b = await request.json().catch(() => null);
  const patch: { name?: string; targetSets?: number | null; targetReps?: string | null; note?: string | null } = {};
  if (typeof b?.name === "string" && b.name.trim()) patch.name = b.name.trim();
  if (b?.targetSets !== undefined)
    patch.targetSets = Number.isFinite(Number(b.targetSets)) ? Number(b.targetSets) : null;
  if (b?.targetReps !== undefined)
    patch.targetReps = typeof b.targetReps === "string" && b.targetReps.trim() ? b.targetReps.trim() : null;
  if (b?.note !== undefined) patch.note = typeof b.note === "string" && b.note.trim() ? b.note.trim() : null;

  const ok = await updateExercise(userId, id, patch);
  if (!ok) return NextResponse.json({ error: "Cvik neexistuje." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = await deleteExercise(userId, id);
  if (!ok) return NextResponse.json({ error: "Cvik neexistuje." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
