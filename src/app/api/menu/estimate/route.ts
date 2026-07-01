import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { estimateDishMacros } from "@/lib/menu-vision";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const name = typeof b?.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Chýba názov." }, { status: 400 });

  try {
    const macros = await estimateDishMacros(name);
    return NextResponse.json({ macros });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Odhad zlyhal." },
      { status: 500 },
    );
  }
}
