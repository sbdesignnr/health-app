import { prisma } from "./prisma";
import {
  bratislavaToday,
  generateEvaluation,
  type EvalAi,
  type EvalStats,
  type InsightType,
} from "./evaluation-ai";

export type InsightDTO = {
  id: string;
  type: string;
  periodStart: string;
  periodEnd: string;
  model: string;
  summary: string | null;
  stats: EvalStats | null;
  ai: EvalAi | null;
  createdAt: string;
};

type InsightRow = {
  id: string;
  type: string;
  periodStart: Date;
  periodEnd: Date;
  model: string;
  summary: string | null;
  content: unknown;
  createdAt: Date;
};

function toDTO(row: InsightRow): InsightDTO {
  const content = (row.content ?? {}) as { stats?: EvalStats; ai?: EvalAi };
  return {
    id: row.id,
    type: row.type,
    periodStart: row.periodStart.toISOString().slice(0, 10),
    periodEnd: row.periodEnd.toISOString().slice(0, 10),
    model: row.model,
    summary: row.summary,
    stats: content.stats ?? null,
    ai: content.ai ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function generateAndSave(
  userId: string,
  type: InsightType,
  endDateStr?: string,
): Promise<InsightDTO> {
  const dateStr = endDateStr ?? bratislavaToday();
  const { stats, ai, model, periodStart, periodEnd } = await generateEvaluation(userId, type, dateStr);

  const row = await prisma.aiInsight.create({
    data: {
      userId,
      type,
      periodStart,
      periodEnd,
      model,
      summary: ai.summary,
      content: { stats, ai },
    },
  });

  return toDTO(row as InsightRow);
}

export async function getInsights(userId: string, limit = 12): Promise<InsightDTO[]> {
  const rows = await prisma.aiInsight.findMany({
    where: { userId, type: { in: ["WEEKLY", "MONTHLY"] } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => toDTO(r as InsightRow));
}
