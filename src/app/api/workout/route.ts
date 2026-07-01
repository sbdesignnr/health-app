import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { addWorkoutBurn, deleteBurn, listDayBurns } from "@/lib/workout";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = new URL(request.url).searchParams.get("date") ?? undefined;
  const burns = await listDayBurns(userId, date);
  const totalKcal = burns.reduce((a, b) => a + b.kcal, 0);
  return NextResponse.json({ burns, totalKcal });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const kcal = Number(b?.kcal);
  if (!Number.isFinite(kcal) || kcal <= 0 || kcal > 10000) {
    return NextResponse.json({ error: "Neplatný výdaj (kcal)." }, { status: 400 });
  }
  const durationMin =
    b?.durationMin != null && Number.isFinite(Number(b.durationMin)) ? Number(b.durationMin) : null;
  const workoutType = typeof b?.workoutType === "string" ? b.workoutType : null;
  const occurredAt = typeof b?.date === "string" ? b.date : null;

  const burn = await addWorkoutBurn(userId, {
    kcal,
    durationMin,
    workoutType,
    source: "MANUAL",
    occurredAt,
  });
  return NextResponse.json({ burn });
}

export async function DELETE(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id =
    new URL(request.url).searchParams.get("id") ??
    ((await request.json().catch(() => null))?.id as string | undefined);
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Chýba id." }, { status: 400 });
  }
  await deleteBurn(userId, id);
  return NextResponse.json({ ok: true });
}
