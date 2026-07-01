import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchByText } from "@/lib/food-service";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });

  try {
    const results = await searchByText(q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("food search error:", err);
    return NextResponse.json({ error: "Vyhľadávanie zlyhalo." }, { status: 502 });
  }
}
