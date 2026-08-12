import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getTrainingProgress, type ProgressRange } from "@/lib/training-progress";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const r = new URL(request.url).searchParams.get("range");
  const range: ProgressRange = r === "day" || r === "year" ? r : "week";
  return NextResponse.json({ progress: await getTrainingProgress(userId, range) });
}
