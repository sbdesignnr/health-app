import { prisma } from "./prisma";
import type { GoalType } from "./energy";

// Krok úpravy kalórií a strop celkovej auto-úpravy (nech appka nezačne robiť čokoľvek extrémne bez kontroly).
const STEP_KCAL = 150;
const CAP_KCAL = 500;

export type AutotuneResult = {
  changed: boolean;
  deltaKcal: number;
  totalAdjustmentKcal: number;
  note: string;
};

// Zdravé tempo zmeny hmotnosti (% telesnej hmotnosti / týždeň) podľa cieľa.
// GAIN_MUSCLE: lean bulk 0,15–0,5 %/týž. LOSE_FAT: 0,4–1,0 %/týž. MAINTAIN: stabilita ±0,25 %/týž.
function decideAdjustment(
  goalType: GoalType,
  pctPerWeek: number,
): { direction: -1 | 0 | 1; reason: string } {
  const p = pctPerWeek.toFixed(2);
  if (goalType === "GAIN_MUSCLE") {
    if (pctPerWeek < 0.15) {
      return { direction: 1, reason: `naberáš pomalšie (${p} %/týždeň) než zdravé tempo pre nabaľovanie (0,15–0,5 %/týždeň)` };
    }
    if (pctPerWeek > 0.5) {
      return { direction: -1, reason: `naberáš rýchlejšie (${p} %/týždeň) než 0,5 %/týždeň – riziko zbytočného tuku navyše` };
    }
    return { direction: 0, reason: "" };
  }
  if (goalType === "LOSE_FAT") {
    if (pctPerWeek > -0.4) {
      return { direction: -1, reason: `chudneš pomalšie (${p} %/týždeň) než 0,4 %/týždeň` };
    }
    if (pctPerWeek < -1.0) {
      return { direction: 1, reason: `chudneš rýchlejšie (${p} %/týždeň) než 1,0 %/týždeň – riziko straty svalov a výkonu` };
    }
    return { direction: 0, reason: "" };
  }
  if (goalType === "MAINTAIN_PERFORMANCE") {
    if (pctPerWeek > 0.25) {
      return { direction: -1, reason: `váha stúpa (${p} %/týždeň) napriek cieľu udržania` };
    }
    if (pctPerWeek < -0.25) {
      return { direction: 1, reason: `váha klesá (${p} %/týždeň) napriek cieľu udržania` };
    }
    return { direction: 0, reason: "" };
  }
  return { direction: 0, reason: "" };
}

/**
 * Uzavretá slučka výživy (fáza 3): raz týždenne porovná trend váhy (priemer posledných 7 dní
 * vs. predchádzajúcich 7 dní) so zdravým tempom pre aktuálny cieľ a podľa toho ticho posunie
 * `calorieAdjustmentKcal` na aktívnom Goal zázname. Vracia dôvod/stav na zapojenie do týždenného
 * AI vyhodnotenia, aby appka vedela vysvetliť PREČO sa cieľ zmenil (alebo prečo nie).
 * Vynechá CUSTOM cieľ a explicitne zadané kalórie – tam používateľ rozhoduje sám.
 */
export async function evaluateAndAdjustCalories(userId: string): Promise<AutotuneResult | null> {
  const goal = await prisma.goal.findFirst({ where: { userId, validTo: null }, orderBy: { validFrom: "desc" } });
  if (!goal || goal.targetCalories != null || goal.type === "CUSTOM") return null;

  const since = new Date();
  since.setDate(since.getDate() - 14);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const logs = await prisma.weightLog.findMany({
    where: { userId, measuredAt: { gte: since } },
    orderBy: { measuredAt: "asc" },
  });
  const thisWeek = logs.filter((l) => l.measuredAt >= weekAgo);
  const lastWeek = logs.filter((l) => l.measuredAt < weekAgo);

  if (thisWeek.length < 2 || lastWeek.length < 2) {
    return {
      changed: false,
      deltaKcal: 0,
      totalAdjustmentKcal: goal.calorieAdjustmentKcal,
      note: "Nedostatok zápisov váhy za posledné 2 týždne na vyhodnotenie trendu (treba aspoň 2× za týždeň) – cieľ sa tento týždeň nemenil.",
    };
  }

  const avg = (arr: typeof logs) => arr.reduce((a, l) => a + l.weightKg, 0) / arr.length;
  const thisAvg = avg(thisWeek);
  const lastAvg = avg(lastWeek);
  const pctPerWeek = ((thisAvg - lastAvg) / lastAvg) * 100;

  const { direction, reason } = decideAdjustment(goal.type as GoalType, pctPerWeek);

  if (direction === 0) {
    return {
      changed: false,
      deltaKcal: 0,
      totalAdjustmentKcal: goal.calorieAdjustmentKcal,
      note: `Trend váhy (${pctPerWeek >= 0 ? "+" : ""}${pctPerWeek.toFixed(2)} %/týždeň) je v zdravom rozsahu pre tvoj cieľ – cieľ sa tento týždeň nemenil.`,
    };
  }

  const current = goal.calorieAdjustmentKcal;
  const atCap = (direction === 1 && current >= CAP_KCAL) || (direction === -1 && current <= -CAP_KCAL);
  if (atCap) {
    return {
      changed: false,
      deltaKcal: 0,
      totalAdjustmentKcal: current,
      note: `Trend: ${reason}. Automatická úprava je už na hranici (${current >= 0 ? "+" : ""}${current} kcal) – oplatí sa to prebrať manuálne, než appka pridá ďalšie kalórie.`,
    };
  }

  const next = Math.max(-CAP_KCAL, Math.min(CAP_KCAL, current + direction * STEP_KCAL));
  const actualDelta = next - current;

  await prisma.goal.update({
    where: { id: goal.id },
    data: { calorieAdjustmentKcal: next, calorieAdjustmentNote: reason },
  });

  return {
    changed: true,
    deltaKcal: actualDelta,
    totalAdjustmentKcal: next,
    note: `Trend: ${reason}. Denný cieľ sa upravil o ${actualDelta > 0 ? "+" : ""}${actualDelta} kcal (celková auto-úprava odteraz: ${next >= 0 ? "+" : ""}${next} kcal).`,
  };
}
