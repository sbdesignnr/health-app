import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getExerciseHistory, logExercise } from "@/lib/training";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exercise = new URL(request.url).searchParams.get("exercise")?.trim() ?? "";
  if (!exercise) return NextResponse.json({ history: [] });

  const history = await getExerciseHistory(userId, exercise);
  return NextResponse.json({ history });
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
  const note = typeof b?.note === "string" && b.note.trim() ? b.note.trim().slice(0, 200) : null;

  const log = await logExercise(userId, { exerciseName: name, weightKg: weight, reps, note });
  const history = await getExerciseHistory(userId, name);
  return NextResponse.json({ log, history });
}
