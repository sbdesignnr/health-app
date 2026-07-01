import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";

export type BurnSource = "WATCH" | "MANUAL";

export type BurnDTO = {
  id: string;
  kcal: number;
  workoutType: string | null;
  durationMin: number | null;
  source: BurnSource;
  occurredAt: string;
};

// Lokálny dátum (Europe/Bratislava) ako YYYY-MM-DD – na denný súčet.
export function bratislavaDate(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function dateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

export async function getOrCreateToken(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { workoutToken: true } });
  if (u?.workoutToken) return u.workoutToken;
  const token = randomBytes(24).toString("base64url");
  await prisma.user.update({ where: { id: userId }, data: { workoutToken: token } });
  return token;
}

export async function regenerateToken(userId: string): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await prisma.user.update({ where: { id: userId }, data: { workoutToken: token } });
  return token;
}

export async function userIdByToken(token: string | null | undefined): Promise<string | null> {
  if (!token || token.length < 10) return null;
  const u = await prisma.user.findFirst({ where: { workoutToken: token }, select: { id: true } });
  return u?.id ?? null;
}

export async function addWorkoutBurn(
  userId: string,
  data: {
    kcal: number;
    workoutType?: string | null;
    durationMin?: number | null;
    source: BurnSource;
    occurredAt?: string | null;
  },
): Promise<BurnDTO> {
  const when = data.occurredAt ? new Date(data.occurredAt) : new Date();
  const valid = Number.isNaN(when.getTime()) ? new Date() : when;
  const created = await prisma.workoutBurn.create({
    data: {
      userId,
      kcal: Math.round(data.kcal),
      workoutType: data.workoutType?.trim() || null,
      durationMin: data.durationMin != null ? Math.round(data.durationMin) : null,
      source: data.source,
      occurredAt: valid,
      burnDate: dateOnly(bratislavaDate(valid)),
    },
  });
  return {
    id: created.id,
    kcal: created.kcal,
    workoutType: created.workoutType,
    durationMin: created.durationMin,
    source: created.source,
    occurredAt: created.occurredAt.toISOString(),
  };
}

// Z Apple Watch prichádza DENNÁ aktívna energia → drž len JEDEN záznam typu WATCH
// za deň a prepíš ho poslednou hodnotou (nie sčítavať pri opakovaných sendoch).
export async function upsertWatchBurn(
  userId: string,
  data: { kcal: number; workoutType?: string | null; occurredAt?: string | null },
): Promise<BurnDTO> {
  const when = data.occurredAt ? new Date(data.occurredAt) : new Date();
  const valid = Number.isNaN(when.getTime()) ? new Date() : when;
  const burnDate = dateOnly(bratislavaDate(valid));
  const value = Math.max(0, Math.round(data.kcal));

  const existing = await prisma.workoutBurn.findFirst({
    where: { userId, source: "WATCH", burnDate },
  });

  const row = existing
    ? await prisma.workoutBurn.update({
        where: { id: existing.id },
        data: {
          kcal: value,
          workoutType: data.workoutType?.trim() || existing.workoutType,
          occurredAt: valid,
        },
      })
    : await prisma.workoutBurn.create({
        data: {
          userId,
          kcal: value,
          workoutType: data.workoutType?.trim() || null,
          durationMin: null,
          source: "WATCH",
          occurredAt: valid,
          burnDate,
        },
      });

  return {
    id: row.id,
    kcal: row.kcal,
    workoutType: row.workoutType,
    durationMin: row.durationMin,
    source: row.source,
    occurredAt: row.occurredAt.toISOString(),
  };
}

// Súčet reálneho výdaja za deň, alebo null ak žiadny záznam (→ použije sa MET odhad).
export async function getDayActualBurnKcal(userId: string, dateStr?: string): Promise<number | null> {
  const day = dateStr ?? bratislavaDate();
  const rows = await prisma.workoutBurn.findMany({
    where: { userId, burnDate: dateOnly(day) },
    select: { kcal: true },
  });
  if (rows.length === 0) return null;
  return rows.reduce((a, r) => a + r.kcal, 0);
}

export async function listDayBurns(userId: string, dateStr?: string): Promise<BurnDTO[]> {
  const day = dateStr ?? bratislavaDate();
  const rows = await prisma.workoutBurn.findMany({
    where: { userId, burnDate: dateOnly(day) },
    orderBy: { occurredAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    kcal: r.kcal,
    workoutType: r.workoutType,
    durationMin: r.durationMin,
    source: r.source,
    occurredAt: r.occurredAt.toISOString(),
  }));
}

export async function deleteBurn(userId: string, id: string): Promise<void> {
  await prisma.workoutBurn.deleteMany({ where: { id, userId } });
}
