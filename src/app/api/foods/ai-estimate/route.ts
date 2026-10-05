import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveByNameAiEstimate } from "@/lib/food-service";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const name = typeof b?.name === "string" ? b.name.trim() : "";
  if (name.length < 2) return NextResponse.json({ error: "Zadaj názov potraviny." }, { status: 400 });

  try {
    const result = await resolveByNameAiEstimate(name);
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI odhad zlyhal." },
      { status: 500 },
    );
  }
}
