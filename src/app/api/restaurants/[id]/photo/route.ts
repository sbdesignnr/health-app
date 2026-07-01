import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { replaceMenu, type MenuItemInput } from "@/lib/restaurants";
import { parseMenuPhoto } from "@/lib/menu-vision";

const MEDIA = ["image/jpeg", "image/png", "image/webp"] as const;
type Media = (typeof MEDIA)[number];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const b = await request.json().catch(() => null);
  const image = typeof b?.image === "string" ? b.image : "";
  const mediaType: Media = MEDIA.includes(b?.mediaType) ? b.mediaType : "image/jpeg";
  if (!image) return NextResponse.json({ error: "Chýba obrázok." }, { status: 400 });

  try {
    const parsed = await parseMenuPhoto(image, mediaType);
    const items: MenuItemInput[] = parsed.map((p) => ({
      dayOfWeek: typeof p.dayOfWeek === "number" && p.dayOfWeek >= 0 && p.dayOfWeek <= 6 ? Math.round(p.dayOfWeek) : null,
      name: p.name,
      description: p.description ?? null,
      priceEur: typeof p.priceEur === "number" ? p.priceEur : null,
      caloriesKcal: p.caloriesKcal,
      proteinG: p.proteinG,
      carbsG: p.carbsG,
      fatG: p.fatG,
      macrosSource: "AI_ESTIMATED",
    }));
    const restaurant = await replaceMenu(userId, id, items);
    return NextResponse.json({ restaurant, count: items.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Prepis menu zlyhal." },
      { status: 500 },
    );
  }
}
