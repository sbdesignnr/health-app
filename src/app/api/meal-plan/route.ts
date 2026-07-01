import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { generateAndSave, getPlan } from "@/lib/meal-plans";

export const maxDuration = 300;

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date =
    new URL(request.url).searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const plan = await getPlan(userId, date);
  return NextResponse.json({ plan });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const date = typeof b?.date === "string" ? b.date : new Date().toISOString().slice(0, 10);

  try {
    const plan = await generateAndSave(userId, date);
    return NextResponse.json({ plan });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generovanie zlyhalo." },
      { status: 500 },
    );
  }
}
