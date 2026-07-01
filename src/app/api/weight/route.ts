import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { addWeight, getWeightSeries, getWeightStats } from "@/lib/weight";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [series, stats] = await Promise.all([getWeightSeries(userId), getWeightStats(userId)]);
  return NextResponse.json({ series, stats });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const weightKg = Number(b?.weightKg);
  if (!(weightKg >= 20 && weightKg <= 400)) {
    return NextResponse.json({ error: "Neplatná váha." }, { status: 400 });
  }
  const measuredAt = typeof b?.measuredAt === "string" ? b.measuredAt : undefined;

  await addWeight(userId, Math.round(weightKg * 10) / 10, measuredAt);

  const [series, stats] = await Promise.all([getWeightSeries(userId), getWeightStats(userId)]);
  return NextResponse.json({ series, stats });
}
