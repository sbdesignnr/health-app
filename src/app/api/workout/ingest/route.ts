import { NextResponse } from "next/server";
import { addWorkoutBurn, userIdByToken } from "@/lib/workout";
import { setSteps } from "@/lib/steps";

// Verejný webhook pre iOS Skratku z Apple Watch. Autentifikácia vlastným tokenom
// (v query ?token=, alebo hlavičke x-workout-token / Authorization: Bearer).
// Podporuje GET aj POST + hodnoty z query alebo JSON tela (kvôli jednoduchosti v Skratkách).
async function handle(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams;
  const token =
    q.get("token") ||
    request.headers.get("x-workout-token") ||
    (request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");

  const userId = await userIdByToken(token);
  if (!userId) return NextResponse.json({ error: "Neplatný token." }, { status: 401 });

  const body =
    request.method === "POST"
      ? ((await request.json().catch(() => null)) as Record<string, unknown> | null)
      : null;
  const pick = (k: string): unknown => (body && body[k] != null ? body[k] : q.get(k));

  const kcalVal = pick("kcal");
  const stepsVal = pick("steps");
  const kcal = kcalVal != null ? Number(kcalVal) : NaN;
  const steps = stepsVal != null ? Number(stepsVal) : NaN;
  const hasKcal = Number.isFinite(kcal) && kcal > 0 && kcal <= 10000;
  const hasSteps = Number.isFinite(steps) && steps >= 0 && steps <= 200000;

  if (!hasKcal && !hasSteps) {
    return NextResponse.json({ error: "Chýba kcal alebo steps." }, { status: 400 });
  }

  const occVal = pick("date") ?? pick("occurredAt");
  const occurredAt = occVal != null ? String(occVal) : null;

  const result: { ok: true; kcal?: number; steps?: number } = { ok: true };

  if (hasKcal) {
    const durVal = pick("durationMin") ?? pick("duration");
    const durationMin = durVal != null && Number.isFinite(Number(durVal)) ? Number(durVal) : null;
    const typeVal = pick("type") ?? pick("workoutType");
    const workoutType = typeVal != null ? String(typeVal) : null;
    const burn = await addWorkoutBurn(userId, {
      kcal,
      durationMin,
      workoutType,
      source: "WATCH",
      occurredAt,
    });
    result.kcal = burn.kcal;
  }

  if (hasSteps) {
    result.steps = await setSteps(userId, steps);
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return handle(request);
}
export async function GET(request: Request) {
  return handle(request);
}
