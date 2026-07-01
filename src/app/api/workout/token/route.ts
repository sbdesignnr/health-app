import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getOrCreateToken, regenerateToken } from "@/lib/workout";

function originOf(request: Request): string {
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getOrCreateToken(userId);
  const url = `${originOf(request)}/api/workout/ingest?token=${token}`;
  return NextResponse.json({ token, url });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await regenerateToken(userId);
  const url = `${originOf(request)}/api/workout/ingest?token=${token}`;
  return NextResponse.json({ token, url });
}
