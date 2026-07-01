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
  } = {};

  const cleanTags = (arr: unknown[]): string[] =>
    arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
  const timeOrNull = (v: unknown): string | null =>
    typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v.trim()) ? v.trim() : null;
  const level1to5 = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 && n <= 5 ? Math.round(n) : null;
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
