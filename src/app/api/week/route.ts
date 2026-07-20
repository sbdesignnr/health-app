import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWeekLoad } from "@/lib/weekly-load";

const TYPES = [
  "FOOTBALL_TRAINING",
  "GYM",
  "MATCH",
  "REST",
  "ACTIVE_RECOVERY",
  "TENNIS",
  "SWIMMING",
  "RUNNING",
  "CUSTOM",
] as const;
type EventTypeLit = (typeof TYPES)[number];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = new URL(request.url).searchParams.get("date") ?? todayStr();
  return NextResponse.json({ week: await getWeekLoad(userId, date) });
}

// Pridá jednorazovú aktivitu na konkrétny deň.
export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const date = typeof b?.date === "string" ? b.date : "";
  const type = TYPES.includes(b?.type) ? (b.type as EventTypeLit) : null;
  if (!date || !type) return NextResponse.json({ error: "Chýba dátum alebo typ." }, { status: 400 });

  const num = (v: unknown, lo: number, hi: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n) : null;
  };

  await prisma.scheduleEvent.create({
    data: {
      userId,
      type,
      title: typeof b?.title === "string" && b.title.trim() ? b.title.trim().slice(0, 80) : null,
      isRecurring: false,
      date: new Date(`${date}T00:00:00Z`),
      durationMin: num(b?.durationMin, 0, 400),
      rpe: num(b?.rpe, 1, 10),
    },
  });

  return NextResponse.json({ week: await getWeekLoad(userId, date) });
}

// Zmení existujúcu aktivitu (typ / trvanie / RPE).
export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const eventId = typeof b?.eventId === "string" ? b.eventId : "";
  if (!eventId) return NextResponse.json({ error: "Chýba eventId." }, { status: 400 });

  const existing = await prisma.scheduleEvent.findFirst({ where: { id: eventId, userId } });
  if (!existing) return NextResponse.json({ error: "Aktivita neexistuje." }, { status: 404 });

  const num = (v: unknown, lo: number, hi: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n) : null;
  };

  await prisma.scheduleEvent.update({
    where: { id: eventId },
    data: {
      type: TYPES.includes(b?.type) ? (b.type as EventTypeLit) : undefined,
      title: b?.title === undefined ? undefined : typeof b.title === "string" && b.title.trim() ? b.title.trim().slice(0, 80) : null,
      durationMin: b?.durationMin === undefined ? undefined : num(b.durationMin, 0, 400),
      rpe: b?.rpe === undefined ? undefined : num(b.rpe, 1, 10),
    },
  });

  const date = typeof b?.date === "string" ? b.date : todayStr();
  return NextResponse.json({ week: await getWeekLoad(userId, date) });
}

export async function DELETE(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId") ?? "";
  const date = url.searchParams.get("date") ?? todayStr();
  if (!eventId) return NextResponse.json({ error: "Chýba eventId." }, { status: 400 });

  await prisma.scheduleEvent.deleteMany({ where: { id: eventId, userId } });
  return NextResponse.json({ week: await getWeekLoad(userId, date) });
}
