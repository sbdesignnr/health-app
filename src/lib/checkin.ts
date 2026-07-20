import { prisma } from "./prisma";
import { bratislavaDate } from "./workout";

export type CheckinDTO = {
  date: string;
  energy: number;
  sleepQuality: number;
  muscleFatigue: number;
  note: string | null;
};

function dateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

export async function getCheckin(userId: string, dateStr?: string): Promise<CheckinDTO | null> {
  const day = dateStr ?? bratislavaDate();
  const row = await prisma.dailyCheckin.findUnique({
    where: { userId_date: { userId, date: dateOnly(day) } },
  });
  if (!row) return null;
  return {
    date: day,
    energy: row.energy,
    sleepQuality: row.sleepQuality,
    muscleFatigue: row.muscleFatigue,
    note: row.note,
  };
}

export async function upsertCheckin(
  userId: string,
  data: { energy: number; sleepQuality: number; muscleFatigue: number; note?: string | null },
  dateStr?: string,
): Promise<CheckinDTO> {
  const day = dateStr ?? bratislavaDate();
  const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)));
  const payload = {
    energy: clamp(data.energy),
    sleepQuality: clamp(data.sleepQuality),
    muscleFatigue: clamp(data.muscleFatigue),
    note: data.note?.trim() || null,
  };
  await prisma.dailyCheckin.upsert({
    where: { userId_date: { userId, date: dateOnly(day) } },
    create: { userId, date: dateOnly(day), ...payload },
    update: payload,
  });
  return { date: day, ...payload };
}

// Zhrnutie pre AI: nízke hodnoty = potreba odľahčenia.
export function checkinSummary(c: CheckinDTO | null): string {
  if (!c) return "dnes nevyplnený";
  const fatigueWord = c.muscleFatigue >= 4 ? "vysoká" : c.muscleFatigue <= 2 ? "nízka" : "stredná";
  const flag =
    c.energy <= 2 || c.sleepQuality <= 2 || c.muscleFatigue >= 4
      ? " ⚠️ ODĽAHČI dnešnú záťaž a zaraď protizápalové/spánkové potraviny."
      : "";
  return `energia ${c.energy}/5, spánok ${c.sleepQuality}/5, únava svalov ${fatigueWord} (${c.muscleFatigue}/5)${
    c.note ? `, poznámka: ${c.note}` : ""
  }.${flag}`;
}
