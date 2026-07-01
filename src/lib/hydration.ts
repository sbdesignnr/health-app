import { prisma } from "./prisma";
import { getWeather } from "./weather";
import { getDayEvents } from "./schedule";

// Pitný režim – fyziologicky podložený (nie len "pi viac keď je teplo"):
// - bazál ~35 ml/kg/deň (aktívny dospelý; EFSA adekvátny príjem ~2.5 L total water/deň pre mužov),
// - prirážka za teplo: +120 ml za každý °C nad 25 °C (dennej maximálnej teploty),
// - prirážka za tréning: náhrada potu 400–800 ml/h podľa intenzity (športová výživa / ACSM).
const BASE_ML_PER_KG = 35;
const HEAT_ML_PER_DEG = 120;
const HEAT_THRESHOLD_C = 25;
const SWEAT_ML_PER_HOUR: Record<string, number> = { LOW: 400, MEDIUM: 600, HIGH: 800 };
const MAX_ML = 6000;

export type HydrationBreakdown = {
  targetMl: number;
  baseMl: number;
  heatMl: number;
  trainingMl: number;
};

export function dailyWaterTargetMl(p: {
  weightKg: number;
  maxTempC: number;
  trainings: { intensity: string; durationMin: number }[];
}): HydrationBreakdown {
  const baseMl = Math.round(p.weightKg * BASE_ML_PER_KG);
  const heatMl = Math.round(Math.max(0, p.maxTempC - HEAT_THRESHOLD_C) * HEAT_ML_PER_DEG);
  let trainingMl = 0;
  for (const t of p.trainings) {
    trainingMl += (SWEAT_ML_PER_HOUR[t.intensity] ?? 600) * (t.durationMin / 60);
  }
  trainingMl = Math.round(trainingMl);
  const total = baseMl + heatMl + trainingMl;
  const targetMl = Math.min(MAX_ML, Math.round(total / 100) * 100);
  return { targetMl, baseMl, heatMl, trainingMl };
}

export async function getHydration(
  userId: string,
  dateStr: string,
): Promise<HydrationBreakdown & { maxTempC: number | null }> {
  const [user, weather, events] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { currentWeightKg: true } }),
    getWeather(),
    getDayEvents(userId, dateStr),
  ]);

  const weightKg = user?.currentWeightKg ?? 75;
  const maxTempC = weather?.daily.maxTempC ?? null;
  const trainings = events
    .filter((e) => e.type !== "REST" && e.type !== "CUSTOM")
    .map((e) => ({ intensity: e.intensity, durationMin: e.durationMin ?? 60 }));

  const breakdown = dailyWaterTargetMl({ weightKg, maxTempC: maxTempC ?? 22, trainings });
  return { ...breakdown, maxTempC };
}
