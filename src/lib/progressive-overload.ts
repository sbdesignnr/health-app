import { prisma } from "./prisma";
import { bratislavaDate } from "./workout";

export type RecentLog = {
  weightKg: number;
  reps: number | null;
  loggedAt: Date;
  setNumber?: number | null;
};
export type ExerciseSession = { date: string; sets: RecentLog[]; volumeKg: number };
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

/**
 * Posledné 2 TRÉNINGY (nie zápisy) pre KAŽDÝ cvik – 2. slúži na detekciu "zaseknutia"
 * pri tej istej váhe. Odkedy sa zapisuje séria po sérii, jeden tréning = viac riadkov
 * v ExerciseLog, preto sa riadky najprv zoskupia podľa lokálneho dňa a z každého dňa
 * sa berie NAJŤAŽŠIA pracovná séria (pri rovnakej váhe tá s viac opakovaniami).
 * Bez tohto by sa dvojitá progresia pozerala na 2 série toho istého tréningu
 * a mylne by hlásila "2× za sebou si nedosiahol cieľ" → zbytočný deload.
 */
export async function recentLogsByName(userId: string): Promise<Map<string, RecentLog[]>> {
  const sessions = await sessionsByName(userId);
  const map = new Map<string, RecentLog[]>();
  for (const [name, list] of sessions) {
    map.set(name, list.map(topSetOf));
  }
  return map;
}

// Najťažšia pracovná séria tréningu (pri rovnakej váhe tá s viac opakovaniami).
export function topSetOf(session: ExerciseSession): RecentLog {
  let top = session.sets[0];
  for (const s of session.sets) {
    if (s.weightKg > top.weightKg || (s.weightKg === top.weightKg && (s.reps ?? 0) > (top.reps ?? 0))) {
      top = s;
    }
  }
  return top;
}

/**
 * Posledné 2 TRÉNINGY každého cviku aj so VŠETKÝMI sériami daného dňa.
 * Jeden dotaz pre celý zoznam splitov – používa to aj dvojitá progresia,
 * aj zobrazenie "naposledy: 60×10 · 65×8" v zozname cvikov.
 */
export async function sessionsByName(userId: string): Promise<Map<string, ExerciseSession[]>> {
  const logs = await prisma.exerciseLog.findMany({
    // rozcvičovacie série do progresie nepatria – sú zámerne ľahké
    where: { userId, isWarmup: false },
    orderBy: { loggedAt: "desc" },
    take: 1500,
    select: { exerciseName: true, setNumber: true, weightKg: true, reps: true, loggedAt: true },
  });

  // cvik → deň → série dňa (poradie dní zostáva zostupné, vďaka orderBy desc)
  const byExercise = new Map<string, Map<string, RecentLog[]>>();
  for (const l of logs) {
    const days = byExercise.get(l.exerciseName) ?? new Map<string, RecentLog[]>();
    const day = bratislavaDate(l.loggedAt);
    // staršie dni, ako sú 2 najnovšie, netreba – šetrí pamäť pri dlhej histórii
    if (!days.has(day) && days.size >= 2) continue;
    const arr = days.get(day) ?? [];
    arr.push({
      weightKg: l.weightKg,
      reps: l.reps,
      loggedAt: l.loggedAt,
      setNumber: l.setNumber,
    });
    days.set(day, arr);
    byExercise.set(l.exerciseName, days);
  }

  const out = new Map<string, ExerciseSession[]>();
  for (const [name, days] of byExercise) {
    const sessions: ExerciseSession[] = [];
    for (const [date, sets] of days) {
      // v rámci dňa chronologicky (séria 1 → n)
      const ordered = sets
        .slice()
        .sort((a, b) =>
          a.setNumber != null && b.setNumber != null
            ? a.setNumber - b.setNumber
            : a.loggedAt.getTime() - b.loggedAt.getTime(),
        );
      sessions.push({
        date,
        sets: ordered,
        volumeKg: Math.round(ordered.reduce((acc, x) => acc + x.weightKg * (x.reps ?? 0), 0)),
      });
    }
    out.set(name, sessions.slice(0, 2));
  }
  return out;
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
