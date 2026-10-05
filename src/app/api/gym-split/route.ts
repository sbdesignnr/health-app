import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getGymSplitTemplate, setGymSplitForPhase, type GymPhase } from "@/lib/gym-split";

const PHASES: GymPhase[] = ["IN_SEASON", "BREAK"];

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ template: await getGymSplitTemplate(userId) });
}

export async function PUT(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const phase = b?.phase;
  if (!PHASES.includes(phase)) {
    return NextResponse.json({ error: "Neplatná fáza." }, { status: 400 });
  }
  const rawDays = Array.isArray(b?.days) ? b.days : [];
  const days: { dayOfWeek: number; focus: string }[] = [];
  for (const d of rawDays) {
    const dow = Number(d?.dayOfWeek);
    const focus = typeof d?.focus === "string" ? d.focus.trim() : "";
    if (!Number.isInteger(dow) || dow < 0 || dow > 6 || !focus) continue;
    days.push({ dayOfWeek: dow, focus });
  }

  const saved = await setGymSplitForPhase(userId, phase as GymPhase, days);
  return NextResponse.json({ days: saved });
}
