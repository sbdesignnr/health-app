import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveCatalogFood } from "@/lib/food-service";

// Kurátorovaná potravina → globálny Food záznam (vráti foodId pre zápis).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const slug = typeof b?.slug === "string" ? b.slug : null;
  if (!slug) return NextResponse.json({ error: "Chýba slug." }, { status: 400 });

  const result = await resolveCatalogFood(slug);
  if (!result) return NextResponse.json({ error: "Potravina sa nenašla." }, { status: 404 });
  return NextResponse.json({ result });
}
