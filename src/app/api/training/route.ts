import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import {
  getActiveProgram,
  generateAndSaveGymProgram,
  generateAndSaveFootballProgram,
} from "@/lib/training";

export const maxDuration = 300;

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const kind = new URL(request.url).searchParams.get("kind") === "FOOTBALL" ? "FOOTBALL" : "GYM";
  const program = await getActiveProgram(userId, kind);
  return NextResponse.json({ program });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const kind = b?.kind === "FOOTBALL" ? "FOOTBALL" : "GYM";

  try {
    const program =
      kind === "FOOTBALL"
        ? await generateAndSaveFootballProgram(userId)
        : await generateAndSaveGymProgram(userId);
    return NextResponse.json({ program });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generovanie zlyhalo." },
      { status: 500 },
    );
  }
}
