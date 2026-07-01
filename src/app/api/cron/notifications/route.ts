import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDueNotifications } from "@/lib/notifications";
import { sendToUser } from "@/lib/push";

type NotifType = "WATER" | "MEAL_TIMING" | "WEATHER_ALERT" | "CUSTOM";

function tagToType(tag?: string): NotifType {
  switch (tag) {
    case "water":
      return "WATER";
    case "weather":
      return "WEATHER_ALERT";
    case "premeal":
      return "MEAL_TIMING";
    default:
      return "CUSTOM";
  }
}

export async function GET(request: Request) {
  // Overenie: Vercel Cron / externý scheduler posiela Bearer CRON_SECRET.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Aktuálna hodina a dátum v Europe/Bratislava.
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = parseInt(get("hour"), 10) % 24;
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;

  // Používatelia s aktívnym push subscription.
  const userIds = (
    await prisma.pushSubscription.findMany({ select: { userId: true }, distinct: ["userId"] })
  ).map((s) => s.userId);

  let totalSent = 0;
  const since = new Date(now.getTime() - 55 * 60 * 1000);

  for (const userId of userIds) {
    const due = await buildDueNotifications(userId, hour, dateStr);
    for (const payload of due) {
      const type = tagToType(payload.tag);
      // Dedup: rovnaký typ už odoslaný v poslednej hodine → preskoč.
      const already = await prisma.notification.findFirst({
        where: { userId, type, sentAt: { gte: since } },
      });
      if (already) continue;

      const { sent } = await sendToUser(userId, payload);
      totalSent += sent;
      await prisma.notification.create({
        data: { userId, type, title: payload.title, body: payload.body },
      });
    }
  }

  return NextResponse.json({ ok: true, hour, dateStr, users: userIds.length, sent: totalSent });
}
