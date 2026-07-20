import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getProfile, setGoalType, updateProfile } from "@/lib/profile";
import { getActiveGoal, getEnergyBreakdown } from "@/lib/goals";
import type { ActivityLevel, GoalType, Sex } from "@/lib/energy";

const ACTIVITY: ActivityLevel[] = ["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"];
const GOALS: GoalType[] = ["LOSE_FAT", "GAIN_MUSCLE", "MAINTAIN_PERFORMANCE", "CUSTOM"];

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user, goal, breakdown] = await Promise.all([
    getProfile(userId),
    getActiveGoal(userId),
    getEnergyBreakdown(userId),
  ]);

  return NextResponse.json({
    profile: user
      ? {
          name: user.name,
          email: user.email,
          heightCm: user.heightCm,
          birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null,
          sex: user.sex,
          activityLevel: user.activityLevel,
          currentWeightKg: user.currentWeightKg,
          dietType: user.dietType,
          allergies: user.allergies,
          dislikes: user.dislikes,
          likes: user.likes,
          supplements: user.supplements,
          healthConcerns: user.healthConcerns,
          healthNotes: user.healthNotes,
          wakeTime: user.wakeTime,
          sleepTime: user.sleepTime,
          stressLevel: user.stressLevel,
          sleepQuality: user.sleepQuality,
          footballLeague: user.footballLeague,
          footballPosition: user.footballPosition,
          yearsPlaying: user.yearsPlaying,
          matchMinutes: user.matchMinutes,
          dominantFoot: user.dominantFoot,
          seasonStartDate: user.seasonStartDate
            ? user.seasonStartDate.toISOString().slice(0, 10)
            : null,
          gymDaysPerWeek: user.gymDaysPerWeek,
          trainingExperience: user.trainingExperience,
          stepGoal: user.stepGoal,
          seasonGoals: user.seasonGoals,
          strengths: user.strengths,
          weaknesses: user.weaknesses,
          injuries: user.injuries,
          currentStatus: user.currentStatus,
          gymEquipment: user.gymEquipment,
          foodRules: user.foodRules,
        }
      : null,
    goalType: goal?.type ?? "MAINTAIN_PERFORMANCE",
    breakdown,
  });
}

export async function PUT(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const data: {
    name?: string | null;
    heightCm?: number;
    birthDate?: string;
    sex?: Sex;
    activityLevel?: ActivityLevel;
    dietType?: string | null;
    allergies?: string[];
    dislikes?: string[];
    likes?: string[];
    supplements?: string[];
    healthConcerns?: string[];
    healthNotes?: string | null;
    wakeTime?: string | null;
    sleepTime?: string | null;
    stressLevel?: number | null;
    sleepQuality?: number | null;
    footballLeague?: string | null;
    footballPosition?: string | null;
    yearsPlaying?: number | null;
    matchMinutes?: number | null;
    dominantFoot?: string | null;
    seasonStartDate?: string | null;
    gymDaysPerWeek?: number | null;
    trainingExperience?: string | null;
    stepGoal?: number | null;
    seasonGoals?: string | null;
    strengths?: string | null;
    weaknesses?: string | null;
    injuries?: string | null;
    currentStatus?: string | null;
    gymEquipment?: string | null;
    foodRules?: string | null;
  } = {};

  const cleanTags = (arr: unknown[]): string[] =>
    arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
  const timeOrNull = (v: unknown): string | null =>
    typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v.trim()) ? v.trim() : null;
  const level1to5 = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 && n <= 5 ? Math.round(n) : null;
  };
  const strOrNull = (v: unknown, max: number): string | null =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  const intOrNull = (v: unknown, lo: number, hi: number): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n) : null;
  };
  const dateOrNull = (v: unknown): string | null => {
    if (typeof v !== "string" || !v.trim()) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : v.trim();
  };

  if (b?.name !== undefined) {
    const n = typeof b.name === "string" ? b.name.trim() : "";
    if (n.length > 60) {
      return NextResponse.json({ error: "Meno je príliš dlhé (max 60 znakov)." }, { status: 400 });
    }
    data.name = n || null;
  }
  if (b?.heightCm != null) {
    const h = Number(b.heightCm);
    if (!(h >= 100 && h <= 250)) {
      return NextResponse.json({ error: "Neplatná výška." }, { status: 400 });
    }
    data.heightCm = Math.round(h);
  }
  if (b?.birthDate != null) {
    const d = new Date(String(b.birthDate));
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Neplatný dátum narodenia." }, { status: 400 });
    }
    data.birthDate = String(b.birthDate);
  }
  if (b?.sex != null) {
    if (b.sex !== "MALE" && b.sex !== "FEMALE") {
      return NextResponse.json({ error: "Neplatné pohlavie." }, { status: 400 });
    }
    data.sex = b.sex;
  }
  if (b?.activityLevel != null) {
    if (!ACTIVITY.includes(b.activityLevel)) {
      return NextResponse.json({ error: "Neplatná aktivita." }, { status: 400 });
    }
    data.activityLevel = b.activityLevel;
  }

  if (b?.dietType !== undefined) {
    data.dietType = typeof b.dietType === "string" && b.dietType.trim() ? b.dietType.trim() : null;
  }
  if (Array.isArray(b?.allergies)) {
    data.allergies = (b.allergies as unknown[])
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim());
  }
  if (Array.isArray(b?.dislikes)) {
    data.dislikes = (b.dislikes as unknown[])
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim());
  }
  if (Array.isArray(b?.likes)) data.likes = cleanTags(b.likes as unknown[]);
  if (Array.isArray(b?.supplements)) data.supplements = cleanTags(b.supplements as unknown[]);
  if (Array.isArray(b?.healthConcerns)) data.healthConcerns = cleanTags(b.healthConcerns as unknown[]);
  if (b?.healthNotes !== undefined) {
    data.healthNotes =
      typeof b.healthNotes === "string" && b.healthNotes.trim()
        ? b.healthNotes.trim().slice(0, 1000)
        : null;
  }
  if (b?.wakeTime !== undefined) data.wakeTime = timeOrNull(b.wakeTime);
  if (b?.sleepTime !== undefined) data.sleepTime = timeOrNull(b.sleepTime);
  if (b?.stressLevel !== undefined) data.stressLevel = level1to5(b.stressLevel);
  if (b?.sleepQuality !== undefined) data.sleepQuality = level1to5(b.sleepQuality);
  if (b?.footballLeague !== undefined) data.footballLeague = strOrNull(b.footballLeague, 60);
  if (b?.footballPosition !== undefined) data.footballPosition = strOrNull(b.footballPosition, 40);
  if (b?.dominantFoot !== undefined)
    data.dominantFoot = ["left", "right", "both"].includes(b.dominantFoot) ? b.dominantFoot : null;
  if (b?.trainingExperience !== undefined)
    data.trainingExperience = strOrNull(b.trainingExperience, 40);
  if (b?.yearsPlaying !== undefined) data.yearsPlaying = intOrNull(b.yearsPlaying, 0, 60);
  if (b?.matchMinutes !== undefined) data.matchMinutes = intOrNull(b.matchMinutes, 0, 200);
  if (b?.gymDaysPerWeek !== undefined) data.gymDaysPerWeek = intOrNull(b.gymDaysPerWeek, 0, 14);
  if (b?.seasonStartDate !== undefined) data.seasonStartDate = dateOrNull(b.seasonStartDate);
  if (b?.stepGoal !== undefined) data.stepGoal = intOrNull(b.stepGoal, 0, 100000);
  if (b?.seasonGoals !== undefined) data.seasonGoals = strOrNull(b.seasonGoals, 600);
  if (b?.strengths !== undefined) data.strengths = strOrNull(b.strengths, 400);
  if (b?.weaknesses !== undefined) data.weaknesses = strOrNull(b.weaknesses, 400);
  if (b?.injuries !== undefined) data.injuries = strOrNull(b.injuries, 400);
  if (b?.currentStatus !== undefined) data.currentStatus = strOrNull(b.currentStatus, 600);
  if (b?.gymEquipment !== undefined) data.gymEquipment = strOrNull(b.gymEquipment, 300);
  if (b?.foodRules !== undefined) data.foodRules = strOrNull(b.foodRules, 1500);

  await updateProfile(userId, data);

  if (b?.goalType != null) {
    if (!GOALS.includes(b.goalType)) {
      return NextResponse.json({ error: "Neplatný cieľ." }, { status: 400 });
    }
    await setGoalType(userId, b.goalType);
  }

  const breakdown = await getEnergyBreakdown(userId);
  return NextResponse.json({ ok: true, breakdown });
}
