import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import {
  deleteExerciseLog,
  getExerciseSessions,
  logExercise,
  updateExerciseLog,
} from "@/lib/training";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exercise = new URL(request.url).searchParams.get("exercise")?.trim() ?? "";
  if (!exercise) return NextResponse.json({ sessions: [] });

  const sessions = await getExerciseSessions(userId, exercise);
  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const name = typeof b?.exerciseName === "string" ? b.exerciseName.trim() : "";
  const weight = Number(b?.weightKg);
  if (!name || !(weight > 0)) {
    return NextResponse.json({ error: "Neplatná váha alebo cvik." }, { status: 400 });
  }
  const reps = b?.reps != null && Number.isFinite(Number(b.reps)) ? Math.round(Number(b.reps)) : null;
  const setNumber =
    b?.setNumber != null && Number.isFinite(Number(b.setNumber)) ? Math.round(Number(b.setNumber)) : null;
  const note = typeof b?.note === "string" && b.note.trim() ? b.note.trim().slice(0, 200) : null;
  const isWarmup = b?.isWarmup === true;

  const log = await logExercise(userId, {
    exerciseName: name,
    weightKg: weight,
    reps,
    setNumber,
    isWarmup,
    note,
  });
  const sessions = await getExerciseSessions(userId, name);
  return NextResponse.json({ log, sessions });
}

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const id = typeof b?.id === "string" ? b.id : "";
  const exercise = typeof b?.exerciseName === "string" ? b.exerciseName.trim() : "";
  if (!id) return NextResponse.json({ error: "Chýba id série." }, { status: 400 });

  const weightKg = b?.weightKg != null && Number(b.weightKg) > 0 ? Number(b.weightKg) : undefined;
  const reps =
    b?.reps === undefined
      ? undefined
      : b.reps == null || b.reps === ""
        ? null
        : Number.isFinite(Number(b.reps))
          ? Math.round(Number(b.reps))
          : undefined;

  const ok = await updateExerciseLog(userId, id, { weightKg, reps });
  if (!ok) return NextResponse.json({ error: "Séria neexistuje." }, { status: 404 });

  const sessions = exercise ? await getExerciseSessions(userId, exercise) : [];
  return NextResponse.json({ ok: true, sessions });
}

export async function DELETE(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const id = sp.get("id")?.trim() ?? "";
  const exercise = sp.get("exercise")?.trim() ?? "";
  if (!id) return NextResponse.json({ error: "Chýba id série." }, { status: 400 });

  await deleteExerciseLog(userId, id);
  const sessions = exercise ? await getExerciseSessions(userId, exercise) : [];
  return NextResponse.json({ ok: true, sessions });
}
