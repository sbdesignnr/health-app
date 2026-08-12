import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { createSplit, listSplits } from "@/lib/splits";

type ExInput = { name: string; targetSets?: number | null; targetReps?: string | null; note?: string | null };

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ splits: await listSplits(userId) });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const name = typeof b?.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Zadaj názov tréningu." }, { status: 400 });

  const exercises: ExInput[] = Array.isArray(b?.exercises)
    ? (b.exercises as unknown[])
        .filter((e): e is ExInput => !!e && typeof (e as ExInput).name === "string" && (e as ExInput).name.trim().length > 0)
        .map((e) => ({
          name: (e.name as string).trim(),
          targetSets: Number.isFinite(Number(e.targetSets)) ? Number(e.targetSets) : null,
          targetReps: typeof e.targetReps === "string" && e.targetReps.trim() ? e.targetReps.trim() : null,
          note: typeof e.note === "string" && e.note.trim() ? e.note.trim() : null,
        }))
    : [];

  const split = await createSplit(userId, { name, note: b?.note ?? null, exercises });
  return NextResponse.json({ split });
}
