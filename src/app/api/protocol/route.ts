import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { createProtocol, endProtocol, getActiveProtocol, getLatestProtocol } from "@/lib/protocol";

export const maxDuration = 300;

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [active, latest] = await Promise.all([getActiveProtocol(userId), getLatestProtocol(userId)]);
  return NextResponse.json({ active, latest });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const stateText = typeof b?.stateText === "string" ? b.stateText.trim() : "";
  if (stateText.length < 10) {
    return NextResponse.json({ error: "Opíš svoj stav aspoň jednou vetou (min. 10 znakov)." }, { status: 400 });
  }
  if (stateText.length > 1500) {
    return NextResponse.json({ error: "Príliš dlhý text (max 1500 znakov)." }, { status: 400 });
  }

  try {
    const protocol = await createProtocol(userId, stateText);
    return NextResponse.json({ protocol });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Vytvorenie protokolu zlyhalo." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await endProtocol(userId);
  return NextResponse.json({ ok: true });
}
