import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { generateAndSave, getInsights } from "@/lib/evaluations";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ insights: await getInsights(userId) });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const type = b?.type;
  if (type !== "WEEKLY" && type !== "MONTHLY") {
    return NextResponse.json({ error: "Neplatný typ." }, { status: 400 });
  }

  try {
    const insight = await generateAndSave(userId, type);
    return NextResponse.json({ insight });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Vyhodnotenie zlyhalo." },
      { status: 500 },
    );
  }
}
