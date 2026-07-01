import { prisma } from "./prisma";
import { netTrainingBurnKcal } from "./energy";

export type EventType = "FOOTBALL_TRAINING" | "GYM" | "MATCH" | "REST" | "CUSTOM";
export type Intensity = "LOW" | "MEDIUM" | "HIGH";

export const EVENT_TYPES: EventType[] = ["FOOTBALL_TRAINING", "GYM", "MATCH", "REST", "CUSTOM"];
export const INTENSITIES: Intensity[] = ["LOW", "MEDIUM", "HIGH"];

export type ScheduleEventDTO = {
  id: string;
  type: EventType;
  title: string | null;
  gymFocus: string | null;
  intensity: Intensity;
  isRecurring: boolean;
  dayOfWeek: number | null; // 0=Ne … 6=So (JS konvencia)
  date: string | null; // YYYY-MM-DD
  startTime: string | null; // HH:MM
  durationMin: number | null;
  estimatedKcal: number | null;
};

export type EventInput = {
  type: EventType;
  title: string | null;
  gymFocus: string | null;
  intensity: Intensity;
  isRecurring: boolean;
  dayOfWeek: number | null;
  date: string | null;
  startTime: string | null;
  durationMin: number | null;
};

function eventBurn(
  weightKg: number | null,
  e: { type: string; intensity: string; gymFocus: string | null; durationMin: number | null },
): number | null {
  if (!weightKg || e.type === "REST" || e.type === "CUSTOM") return null;
  return netTrainingBurnKcal({
    weightKg,
    type: e.type,
    intensity: e.intensity,
    gymFocus: e.gymFocus,
    durationMin: e.durationMin ?? 60,
  });
}

// Udalosti rozvrhu platné pre daný kalendárny deň (opakujúce sa + jednorazové).
export async function getDayEvents(userId: string, dateStr: string) {
  const dow = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  const dayStart = new Date(`${dateStr}T00:00:00Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59Z`);
  return prisma.scheduleEvent.findMany({
    where: {
      userId,
      OR: [
        { isRecurring: true, dayOfWeek: dow },
        { isRecurring: false, date: { gte: dayStart, lte: dayEnd } },
      ],
    },
  });
}

// Súčet NET tréningového výdaja (kcal) pre kalendárny deň (YYYY-MM-DD).
// LIVE výpočet s aktuálnou váhou → cieľ sa v tréningový deň automaticky zvýši.
export async function getDayTrainingBurnKcal(
  userId: string,
  weightKg: number,
  dateStr?: string,
): Promise<number> {
  if (!dateStr) return 0;
  const events = await getDayEvents(userId, dateStr);
  let total = 0;
  for (const e of events) total += eventBurn(weightKg, e) ?? 0;
  return total;
}

export async function listEvents(userId: string): Promise<ScheduleEventDTO[]> {
  const [user, events] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { currentWeightKg: true } }),
    prisma.scheduleEvent.findMany({
      where: { userId },
      orderBy: [{ isRecurring: "desc" }, { dayOfWeek: "asc" }, { date: "asc" }, { startTime: "asc" }],
    }),
  ]);
  const w = user?.currentWeightKg ?? null;

  return events.map((e) => ({
    id: e.id,
    type: e.type as EventType,
    title: e.title,
    gymFocus: e.gymFocus,
    intensity: e.intensity as Intensity,
    isRecurring: e.isRecurring,
    dayOfWeek: e.dayOfWeek,
    date: e.date ? e.date.toISOString().slice(0, 10) : null,
    startTime: e.startTime,
    durationMin: e.durationMin,
    estimatedKcal: eventBurn(w, e),
  }));
}

export async function createEvent(userId: string, input: EventInput) {
  return prisma.scheduleEvent.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      gymFocus: input.gymFocus,
      intensity: input.intensity,
      isRecurring: input.isRecurring,
      dayOfWeek: input.isRecurring ? input.dayOfWeek : null,
      date: !input.isRecurring && input.date ? new Date(input.date) : null,
      startTime: input.startTime,
      durationMin: input.durationMin,
    },
  });
}

export async function updateEvent(userId: string, id: string, input: EventInput) {
  const ev = await prisma.scheduleEvent.findFirst({ where: { id, userId } });
  if (!ev) throw new Error("Udalosť neexistuje.");
  return prisma.scheduleEvent.update({
    where: { id },
    data: {
      type: input.type,
      title: input.title,
      gymFocus: input.gymFocus,
      intensity: input.intensity,
      isRecurring: input.isRecurring,
      dayOfWeek: input.isRecurring ? input.dayOfWeek : null,
      date: !input.isRecurring && input.date ? new Date(input.date) : null,
      startTime: input.startTime,
      durationMin: input.durationMin,
    },
  });
}

export async function deleteEvent(userId: string, id: string) {
  await prisma.scheduleEvent.deleteMany({ where: { id, userId } });
}

// Validácia vstupu z API (bez `any`).
export function parseEventInput(raw: unknown): EventInput | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;

  const type = b.type;
  const intensity = b.intensity;
  if (typeof type !== "string" || !EVENT_TYPES.includes(type as EventType)) return null;
  if (typeof intensity !== "string" || !INTENSITIES.includes(intensity as Intensity)) return null;

  const isRecurring = b.isRecurring === true;
  let dayOfWeek: number | null = null;
  let date: string | null = null;

  if (isRecurring) {
    const d = Number(b.dayOfWeek);
    if (!Number.isInteger(d) || d < 0 || d > 6) return null;
    dayOfWeek = d;
  } else {
    if (typeof b.date !== "string" || Number.isNaN(new Date(b.date).getTime())) return null;
    date = b.date;
  }

  let durationMin: number | null = null;
  if (b.durationMin != null && b.durationMin !== "") {
    const dm = Number(b.durationMin);
    if (!(dm > 0 && dm <= 600)) return null;
    durationMin = Math.round(dm);
  }

  const startTime =
    typeof b.startTime === "string" && /^\d{2}:\d{2}$/.test(b.startTime) ? b.startTime : null;
  const title = typeof b.title === "string" && b.title.trim() ? b.title.trim() : null;
  const gymFocus = typeof b.gymFocus === "string" && b.gymFocus.trim() ? b.gymFocus.trim() : null;

  return {
    type: type as EventType,
    intensity: intensity as Intensity,
    isRecurring,
    dayOfWeek,
    date,
    durationMin,
    startTime,
    title,
    gymFocus,
  };
}
