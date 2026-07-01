import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { createEvent, listEvents, parseEventInput } from "@/lib/schedule";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ events: await listEvents(userId) });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = parseEventInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Neplatné dáta udalosti." }, { status: 400 });

  await createEvent(userId, input);
  return NextResponse.json({ events: await listEvents(userId) });
}
