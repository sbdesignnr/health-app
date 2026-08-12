import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchLocal, searchOff } from "@/lib/food-service";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const mode = url.searchParams.get("mode"); // "local" (okamžité) | "off" (značkové) | null (oboje)
  if (!q) return NextResponse.json({ results: [] });

  try {
    if (mode === "local") {
      return NextResponse.json({ results: await searchLocal(q, user.id) });
    }
    if (mode === "off") {
      return NextResponse.json({ results: await searchOff(q) });
    }
    const [local, off] = await Promise.all([searchLocal(q, user.id), searchOff(q)]);
    return NextResponse.json({ results: [...local, ...off] });
  } catch (err) {
    console.error("food search error:", err);
    return NextResponse.json({ error: "Vyhľadávanie zlyhalo." }, { status: 502 });
  }
}
