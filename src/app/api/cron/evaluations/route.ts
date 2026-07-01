import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAndSave } from "@/lib/evaluations";
import { bratislavaToday } from "@/lib/evaluation-ai";

// Spúšťať denne (napr. 5:00 UTC). Vnútri rozhodne: pondelok → týždenné,
// 1. deň v mesiaci → mesačné. Tým sa vyhneme tz/DST problémom v cron výraze.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateStr = bratislavaToday();
  const noon = new Date(`${dateStr}T12:00:00Z`);
  const weekday = noon.getUTCDay(); // 0=Ne … 1=Po
  const dayOfMonth = noon.getUTCDate();

  const isMonday = weekday === 1;
  const isFirst = dayOfMonth === 1;
  if (!isMonday && !isFirst) {
    return NextResponse.json({ ok: true, skipped: true, dateStr });
  }

  const users = await prisma.user.findMany({ select: { id: true } });
  let generated = 0;

  for (const u of users) {
    if (isMonday) {
      await generateAndSave(u.id, "WEEKLY", dateStr).catch(() => {});
      generated += 1;
    }
    if (isFirst) {
      await generateAndSave(u.id, "MONTHLY", dateStr).catch(() => {});
      generated += 1;
    }
  }

  return NextResponse.json({ ok: true, dateStr, weekly: isMonday, monthly: isFirst, generated });
}
