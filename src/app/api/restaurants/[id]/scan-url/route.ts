import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { replaceMenu, updateRestaurant, type MenuItemInput } from "@/lib/restaurants";
import { parseMenuText } from "@/lib/menu-vision";

export const maxDuration = 60;

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n")
    .trim();
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const b = await request.json().catch(() => null);
  let url = typeof b?.url === "string" ? b.url.trim() : "";
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") throw new Error();
  } catch {
    return NextResponse.json({ error: "Neplatná URL adresa." }, { status: 400 });
  }

  // 1) Stiahni stránku (s timeoutom a browser User-Agentom).
  let html = "";
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(parsedUrl.toString(), {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HealthAssistant/1.0",
        Accept: "text/html,application/xhtml+xml,text/plain",
        "Accept-Language": "sk,cs,en;q=0.8",
      },
    });
    clearTimeout(to);
    if (!res.ok) throw new Error(String(res.status));
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html") && !ct.includes("text")) {
      return NextResponse.json(
        { error: "Stránka nie je textová (asi PDF/obrázok). Skús odfotiť menu." },
        { status: 422 },
      );
    }
    html = await res.text();
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      {
        error: `${aborted ? "Načítanie stránky trvalo príliš dlho." : "Stránku sa nepodarilo načítať."} Skús inú URL alebo odfoť menu.`,
      },
      { status: 502 },
    );
  }

  const text = htmlToText(html).slice(0, 18000);
  if (text.length < 40) {
    return NextResponse.json(
      { error: "Zo stránky sa nedal prečítať text (asi je ako obrázok/JS). Skús odfotiť menu." },
      { status: 422 },
    );
  }

  // 2) AI vytiahne menu z textu.
  try {
    const parsed = await parseMenuText(text);
    const items: MenuItemInput[] = parsed
      .filter((p) => p.name && p.name.trim())
      .map((p) => ({
        dayOfWeek:
          typeof p.dayOfWeek === "number" && p.dayOfWeek >= 0 && p.dayOfWeek <= 6
            ? Math.round(p.dayOfWeek)
            : null,
        name: p.name,
        description: p.description ?? null,
        priceEur: typeof p.priceEur === "number" ? p.priceEur : null,
        caloriesKcal: p.caloriesKcal,
        proteinG: p.proteinG,
        carbsG: p.carbsG,
        fatG: p.fatG,
        macrosSource: "AI_ESTIMATED",
      }));

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Na stránke sme nenašli žiadne jedlá. Skús odfotiť menu alebo pridať ručne." },
        { status: 422 },
      );
    }

    // Ulož URL najprv, aby replaceMenu vrátil čerstvé DTO aj s menuUrl.
    await updateRestaurant(userId, id, { menuUrl: parsedUrl.toString() });
    const restaurant = await replaceMenu(userId, id, items);
    return NextResponse.json({ restaurant, count: items.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Spracovanie menu zlyhalo." },
      { status: 500 },
    );
  }
}
