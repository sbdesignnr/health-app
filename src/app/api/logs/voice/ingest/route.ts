import { NextResponse } from "next/server";
import { userIdByToken } from "@/lib/workout";
import { parseAndLogVoice } from "@/lib/voice-log";

export const maxDuration = 60;

// Verejný webhook pre Siri Skratku – hlasové zapisovanie jedla.
// Autentifikácia rovnakým tokenom ako Apple Watch (query ?token= alebo hlavička).
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
  const text = String(body?.text ?? q.get("text") ?? "").trim();
  const meal = String(body?.meal ?? q.get("meal") ?? "").trim() || undefined;

  if (!text) return NextResponse.json({ error: "Chýba text." }, { status: 400 });

  try {
    const logged = await parseAndLogVoice(userId, text, meal);
    if (logged.length === 0) {
      return NextResponse.json({ ok: true, count: 0, message: "Nenašiel som žiadne jedlo." });
    }
    const totalKcal = logged.reduce((a, l) => a + l.kcal, 0);
    return NextResponse.json({
      ok: true,
      count: logged.length,
      totalKcal,
      message: `Zapísané: ${logged.map((l) => l.name).join(", ")} (${totalKcal} kcal).`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Zápis zlyhal." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return handle(request);
}
export async function GET(request: Request) {
  return handle(request);
}
