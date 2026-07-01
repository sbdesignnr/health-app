import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getWeather } from "@/lib/weather";
import { getHydration } from "@/lib/hydration";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date =
    new URL(request.url).searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const [weather, hydration] = await Promise.all([getWeather(), getHydration(userId, date)]);

  return NextResponse.json({ weather, hydration });
}
