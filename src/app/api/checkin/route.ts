import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getCheckin, upsertCheckin } from "@/lib/checkin";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = new URL(request.url).searchParams.get("date") ?? undefined;
  return NextResponse.json({ checkin: await getCheckin(userId, date) });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const energy = Number(b?.energy);
  const sleepQuality = Number(b?.sleepQuality);
  const muscleFatigue = Number(b?.muscleFatigue);
  if (![energy, sleepQuality, muscleFatigue].every((n) => Number.isFinite(n) && n >= 1 && n <= 5)) {
    return NextResponse.json({ error: "Hodnoty musia byť 1–5." }, { status: 400 });
  }

  const checkin = await upsertCheckin(
    userId,
    { energy, sleepQuality, muscleFatigue, note: typeof b?.note === "string" ? b.note : null },
    typeof b?.date === "string" ? b.date : undefined,
  );
  return NextResponse.json({ checkin });
}
