import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getSteps, overwriteSteps } from "@/lib/steps";
import { getOrCreateToken } from "@/lib/workout";

function originOf(request: Request): string {
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const date = sp.get("date") ?? undefined;
  const data = await getSteps(userId, date);

  // ?setup=1 → pribalí hotovú adresu pre iOS Skratku (sync krokov zo Zdravia)
  if (sp.get("setup")) {
    const token = await getOrCreateToken(userId);
    return NextResponse.json({
      ...data,
      syncUrl: `${originOf(request)}/api/workout/ingest?token=${token}&steps=`,
    });
  }

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
  await overwriteSteps(userId, steps, date);
  return NextResponse.json(await getSteps(userId, date));
}
