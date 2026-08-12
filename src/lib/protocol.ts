import { prisma } from "./prisma";
import { generateProtocol, type ProtocolSupplement } from "./protocol-ai";
import { bratislavaDate } from "./workout";

export type ProtocolDTO = {
  id: string;
  stateText: string;
  title: string;
  focus: string;
  rationale: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  daysLeft: number;
  principles: string[];
  emphasizeFoods: string[];
  avoidFoods: string[];
  supplements: ProtocolSupplement[];
  expectations: string | null;
  active: boolean;
  createdAt: string;
};

type Row = {
  id: string;
  stateText: string;
  title: string;
  focus: string;
  rationale: string;
  durationDays: number;
  startDate: Date;
  endDate: Date;
  principles: unknown;
  emphasizeFoods: unknown;
  avoidFoods: unknown;
  supplements: unknown;
  expectations: string | null;
  active: boolean;
  createdAt: Date;
};

function daysBetween(fromISO: string, toDate: Date): number {
  const from = Date.parse(`${fromISO}T00:00:00Z`);
  const to = toDate.getTime();
  return Math.ceil((to - from) / 86400000);
}

function toDTO(r: Row): ProtocolDTO {
  const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
  return {
    id: r.id,
    stateText: r.stateText,
    title: r.title,
    focus: r.focus,
    rationale: r.rationale,
    durationDays: r.durationDays,
    startDate: r.startDate.toISOString().slice(0, 10),
    endDate: r.endDate.toISOString().slice(0, 10),
    daysLeft: Math.max(0, daysBetween(bratislavaDate(), r.endDate)),
    principles: arr(r.principles),
    emphasizeFoods: arr(r.emphasizeFoods),
    avoidFoods: arr(r.avoidFoods),
    supplements: Array.isArray(r.supplements) ? (r.supplements as ProtocolSupplement[]) : [],
    expectations: r.expectations,
    active: r.active,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Aktívny protokol (ešte platný podľa dátumu). */
export async function getActiveProtocol(userId: string): Promise<ProtocolDTO | null> {
  const today = new Date(`${bratislavaDate()}T00:00:00Z`);
  const row = await prisma.nutritionProtocol.findFirst({
    where: { userId, active: true, endDate: { gte: today } },
    orderBy: { createdAt: "desc" },
  });
  return row ? toDTO(row as Row) : null;
}

/** Najnovší protokol (aj keď už uplynul – na zobrazenie histórie/tlačidla obnovy). */
export async function getLatestProtocol(userId: string): Promise<ProtocolDTO | null> {
  const row = await prisma.nutritionProtocol.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return row ? toDTO(row as Row) : null;
}

/** Vytvorí nový protokol z aktuálneho stavu a zneaktívni predchádzajúce. */
export async function createProtocol(userId: string, stateText: string): Promise<ProtocolDTO> {
  const result = await generateProtocol(userId, stateText);

  const startStr = bratislavaDate();
  const start = new Date(`${startStr}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + result.durationDays);

  const created = await prisma.$transaction(async (tx) => {
    await tx.nutritionProtocol.updateMany({ where: { userId, active: true }, data: { active: false } });
    return tx.nutritionProtocol.create({
      data: {
        userId,
        stateText: stateText.trim(),
        title: result.title,
        focus: result.focus,
        rationale: result.rationale,
        durationDays: result.durationDays,
        startDate: start,
        endDate: end,
        principles: result.principles,
        emphasizeFoods: result.emphasizeFoods,
        avoidFoods: result.avoidFoods,
        supplements: result.supplements,
        expectations: result.expectations,
        model: result.model,
        active: true,
      },
    });
  });

  return toDTO(created as Row);
}

/** Ukončí aktívny protokol. */
export async function endProtocol(userId: string): Promise<void> {
  await prisma.nutritionProtocol.updateMany({ where: { userId, active: true }, data: { active: false } });
}

/** Krátky súhrn aktívneho protokolu pre AI kontext jedálnička. */
export function protocolForAi(p: ProtocolDTO): string {
  const lines: string[] = [];
  lines.push(`AKTÍVNY VÝŽIVOVÝ PROTOKOL: „${p.title}“ (deň ${p.durationDays - p.daysLeft + 1}/${p.durationDays}, ostáva ${p.daysLeft} dní)`);
  lines.push(`Cieľ: ${p.focus}`);
  if (p.principles.length) lines.push(`Zásady: ${p.principles.join(" | ")}`);
  if (p.emphasizeFoods.length) lines.push(`ZARAĎUJ: ${p.emphasizeFoods.join(" | ")}`);
  if (p.avoidFoods.length) lines.push(`OBMEDZ/VYHNI SA: ${p.avoidFoods.join(" | ")}`);
  return lines.join("\n");
}
