import { prisma } from "./prisma";

export type RecentLog = { weightKg: number; reps: number | null; loggedAt: Date };
export type LoadSuggestion = { weightKg: number; reps: number; rationale: string };

// Parsuje cieľový rozsah opakovaní z textu (AI alebo vlastný split), napr. "8–10", "8-10", "5", "AMRAP".
export function parseRepRange(reps: string | null | undefined): { min: number; max: number } | null {
  if (!reps) return null;
  const nums = reps.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  if (nums.length === 1) {
    const n = Number(nums[0]);
    return { min: n, max: n };
  }
  const a = Number(nums[0]);
  const b = Number(nums[1]);
  return a <= b ? { min: a, max: b } : { min: b, max: a };
}

// Rozumný krok prírastku váhy: ~2,5 % aktuálnej váhy, zaokrúhlené na 0,5 kg, minimálne 1 kg.
function weightIncrement(weightKg: number): number {
  return Math.max(1, Math.round(weightKg * 0.025 * 2) / 2);
}
function round05(kg: number): number {
  return Math.round(kg * 2) / 2;
}

// Posledné 2 zápisy pre KAŽDÝ cvik používateľa (2. slúži na detekciu "zaseknutia" pri tej istej váhe).
export async function recentLogsByName(userId: string): Promise<Map<string, RecentLog[]>> {
  const logs = await prisma.exerciseLog.findMany({
    where: { userId },
    orderBy: { loggedAt: "desc" },
    take: 600,
    select: { exerciseName: true, weightKg: true, reps: true, loggedAt: true },
  });
  const map = new Map<string, RecentLog[]>();
  for (const l of logs) {
    const arr = map.get(l.exerciseName) ?? [];
    if (arr.length < 2) {
      arr.push({ weightKg: l.weightKg, reps: l.reps, loggedAt: l.loggedAt });
      map.set(l.exerciseName, arr);
    }
  }
  return map;
}

/**
 * Dvojitá progresia (double progression) nad reálne zapísanou históriou:
 * - dosiahol vrch cieľového rozsahu opakovaní → zvýš váhu, vráť sa na spodok rozsahu
 * - je v rozsahu, ale nie na vrchu → rovnaká váha, skús +1 opakovanie
 * - nedosiahol spodok rozsahu 2× za sebou pri tej istej váhe → zníž váhu (deload)
 * - nedosiahol spodok rozsahu prvý raz → skús tú istú váhu znova
 */
export function suggestNextLoad(
  recent: RecentLog[],
  targetReps: string | null | undefined,
): LoadSuggestion | null {
  if (recent.length === 0) return null;
  const [last, prev] = recent;
  const range = parseRepRange(targetReps);

  if (last.reps == null) {
    return {
      weightKg: last.weightKg,
      reps: range?.min ?? 0,
      rationale:
        "Naposledy chýbajú zapísané opakovania – skús rovnakú váhu a tentoraz zapíš aj opakovania, nech appka vie presnejšie poradiť.",
    };
  }

  if (!range) {
    return {
      weightKg: last.weightKg,
      reps: last.reps,
      rationale: `Naposledy ${last.weightKg} kg × ${last.reps}. Skús to zopakovať alebo mierne prekonať.`,
    };
  }

  if (last.reps >= range.max) {
    const nextWeight = round05(last.weightKg + weightIncrement(last.weightKg));
    return {
      weightKg: nextWeight,
      reps: range.min,
      rationale: `Naposledy ${last.weightKg} kg × ${last.reps} – dosiahol si vrch rozsahu (${range.max}), ide sa na vyššiu váhu.`,
    };
  }

  if (last.reps < range.min) {
    const stuckTwice =
      prev && prev.weightKg === last.weightKg && prev.reps != null && prev.reps < range.min;
    if (stuckTwice) {
      return {
        weightKg: round05(last.weightKg * 0.9),
        reps: range.min,
        rationale: `2× za sebou pri ${last.weightKg} kg si nedosiahol cieľových ${range.min} opakovaní – zníženie váhy na regeneráciu, potom znova nahor.`,
      };
    }
    return {
      weightKg: last.weightKg,
      reps: range.min,
      rationale: `Naposledy ${last.weightKg} kg × ${last.reps} – skús rovnakú váhu znova, cieľ je aspoň ${range.min} opakovaní.`,
    };
  }

  return {
    weightKg: last.weightKg,
    reps: Math.min(last.reps + 1, range.max),
    rationale: `Naposledy ${last.weightKg} kg × ${last.reps} – skús tentoraz o opakovanie viac.`,
  };
}
