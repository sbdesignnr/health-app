import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getSteps, overwriteSteps } from "@/lib/steps";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = new URL(request.url).searchParams.get("date") ?? undefined;
  const data = await getSteps(userId, date);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const steps = Number(b?.steps);
  if (!Number.isFinite(steps) || steps < 0 || steps > 200000) {
    return NextResponse.json({ error: "Neplatný počet krokov." }, { status: 400 });
  }
  const date = typeof b?.date === "string" ? b.date : undefined;
  const value = await overwriteSteps(userId, steps, date);
  const data = await getSteps(userId, date);
  return NextResponse.json({ steps: value, goal: data.goal });
}
