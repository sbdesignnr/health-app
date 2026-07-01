import { anthropic } from "./anthropic";
import { prisma } from "./prisma";
import { getEnergyBreakdown } from "./goals";

const MODEL = "claude-opus-4-8";

export type InsightType = "WEEKLY" | "MONTHLY";

export type EvalStats = {
  daysLogged: number;
  totalDays: number;
  avgKcal: number;
  avgProteinG: number;
  avgCarbsG: number;
  avgFatG: number;
  weightStartKg: number | null;
  weightEndKg: number | null;
  weightChangeKg: number | null;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
};

export type EvalAi = {
  summary: string;
  weightAssessment: string;
  consistency: string;
  macroAssessment: string;
  recommendations: string[];
  score: number;
};

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "2–3 vety celkový prehľad" },
    weightAssessment: { type: "string", description: "trend váhy vs cieľ" },
    consistency: { type: "string", description: "konzistentnosť zapisovania" },
    macroAssessment: { type: "string", description: "plnenie makier vs cieľ" },
    recommendations: { type: "array", items: { type: "string" } },
    score: { type: "number", description: "celkové skóre dodržiavania 0–100" },
  },
  required: ["summary", "weightAssessment", "consistency", "macroAssessment", "recommendations", "score"],
  additionalProperties: false,
};

const SYSTEM = `Si skúsený športový kouč a nutričný špecialista. Vyhodnocuješ progres športovca (futbal + posilňovňa) za obdobie.
Buď konkrétny, dátový a praktický – odporúčania majú byť akčné s číslami (nie vágne rady).
Zohľadni cieľ (chudnutie/naberanie/udržanie) a nadviaž na predchádzajúce vyhodnotenia, ak sú.
Odpovedaj VÝHRADNE cez štruktúrovanú schému, po slovensky.`;

const GOAL_SK: Record<string, string> = {
  LOSE_FAT: "chudnutie",
  GAIN_MUSCLE: "naberanie svalov",
  MAINTAIN_PERFORMANCE: "udržanie + výkon",
  CUSTOM: "vlastný",
};

function localDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bratislava" }).format(d);
}

export function bratislavaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function periodFor(type: InsightType, endDateStr: string) {
  const end = new Date(`${endDateStr}T00:00:00Z`);
  const days = type === "WEEKLY" ? 7 : 30;
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  const lastDay = new Date(end);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  return { start, end, lastDay, days };
}

async function gatherStats(
  userId: string,
  start: Date,
  end: Date,
  days: number,
): Promise<EvalStats> {
  const [foodLogs, weightLogs, breakdown] = await Promise.all([
    prisma.foodLog.findMany({ where: { userId, loggedAt: { gte: start, lt: end } } }),
    prisma.weightLog.findMany({
      where: { userId, measuredAt: { gte: start, lt: end } },
      orderBy: { measuredAt: "asc" },
    }),
    getEnergyBreakdown(userId),
  ]);

  const byDay = new Map<string, { kcal: number; p: number; c: number; f: number }>();
  for (const l of foodLogs) {
    const day = localDay(l.loggedAt);
    const cur = byDay.get(day) ?? { kcal: 0, p: 0, c: 0, f: 0 };
    cur.kcal += l.caloriesKcal;
    cur.p += l.proteinG;
    cur.c += l.carbsG;
    cur.f += l.fatG;
    byDay.set(day, cur);
  }

  const daysLogged = byDay.size;
  const n = daysLogged || 1;
  const sum = [...byDay.values()].reduce(
    (a, d) => ({ kcal: a.kcal + d.kcal, p: a.p + d.p, c: a.c + d.c, f: a.f + d.f }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );

  const t = breakdown.targets;
  const ws = weightLogs[0]?.weightKg ?? null;
  const we = weightLogs[weightLogs.length - 1]?.weightKg ?? null;

  return {
    daysLogged,
    totalDays: days,
    avgKcal: Math.round(sum.kcal / n),
    avgProteinG: Math.round(sum.p / n),
    avgCarbsG: Math.round(sum.c / n),
    avgFatG: Math.round(sum.f / n),
    weightStartKg: ws,
    weightEndKg: we,
    weightChangeKg: ws != null && we != null ? Math.round((we - ws) * 10) / 10 : null,
    targetCalories: t.caloriesKcal,
    targetProteinG: t.proteinG,
    targetCarbsG: t.carbsG,
    targetFatG: t.fatG,
  };
}

export async function generateEvaluation(userId: string, type: InsightType, endDateStr: string) {
  const { start, end, lastDay, days } = periodFor(type, endDateStr);
  const [stats, breakdown, prevInsights] = await Promise.all([
    gatherStats(userId, start, end, days),
    getEnergyBreakdown(userId),
    prisma.aiInsight.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 2 }),
  ]);

  const lines: string[] = [];
  lines.push(`OBDOBIE: ${type === "WEEKLY" ? "týždenné" : "mesačné"} (${localDay(start)} – ${localDay(lastDay)})`);
  lines.push(`CIEĽ: ${GOAL_SK[breakdown.goalType] ?? breakdown.goalType}`);
  lines.push(
    `DENNÝ CIEĽ: ${stats.targetCalories} kcal (${stats.targetProteinG} B / ${stats.targetCarbsG} S / ${stats.targetFatG} T)`,
  );
  lines.push("");
  lines.push("ŠTATISTIKY OBDOBIA:");
  lines.push(`- Zapísané dni: ${stats.daysLogged} / ${stats.totalDays}`);
  lines.push(
    `- Priemerný denný príjem: ${stats.avgKcal} kcal (${stats.avgProteinG} B / ${stats.avgCarbsG} S / ${stats.avgFatG} T)`,
  );
  if (stats.weightStartKg != null && stats.weightEndKg != null) {
    lines.push(
      `- Váha: ${stats.weightStartKg} → ${stats.weightEndKg} kg (Δ ${stats.weightChangeKg} kg)`,
    );
  } else {
    lines.push("- Váha: nedostatok záznamov v období");
  }
  lines.push("");
  if (prevInsights.length) {
    lines.push("PREDCHÁDZAJÚCE VYHODNOTENIA (nadviaž, sleduj či sa odporúčania plnia):");
    for (const p of prevInsights) lines.push(`- ${p.summary ?? "(bez súhrnu)"}`);
    lines.push("");
  }
  lines.push("Vyhodnoť progres a daj 3–5 konkrétnych odporúčaní.");

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: lines.join("\n") }],
  });

  if (res.stop_reason === "refusal") throw new Error("AI odmietlo požiadavku.");
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("AI nevrátilo vyhodnotenie.");
  const ai = JSON.parse(block.text) as EvalAi;

  return { stats, ai, model: MODEL, periodStart: start, periodEnd: lastDay };
}
