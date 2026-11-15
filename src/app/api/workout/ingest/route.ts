import { NextResponse } from "next/server";
import { upsertWatchBurn, userIdByToken, bratislavaDate } from "@/lib/workout";
import { setSteps } from "@/lib/steps";

// Verejný webhook pre iOS Skratku z Apple Watch / appky Zdravie. Autentifikácia vlastným
// tokenom (v query ?token=, alebo hlavičke x-workout-token / Authorization: Bearer).
// Podporuje GET aj POST + hodnoty z query alebo JSON tela (kvôli jednoduchosti v Skratkách).

/**
 * Skratky posielajú hodnoty zo Zdravia tak, ako ich zobrazujú – teda napr.
 * "8 452", "8,452", "8452 krokov", "350 kcal", "1 234,5". Obyčajné Number()
 * na tom vráti NaN, request skončil ako 400 a kroky sa NEZAPÍSALI. Preto
 * hodnotu najprv očistíme: medzery (aj nezlomiteľné), oddeľovače tisícov a text.
 */
function parseNumberLoose(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (value == null) return NaN;

  let s = String(value).trim();
  if (!s) return NaN;

  // zahoď všetko okrem číslic, oddeľovačov a znamienka (jednotky: "krokov", "kcal", "cal"…)
  s = s.replace(/[^\d,.\-\s  ']/g, "").trim();
  // oddeľovače tisícov: medzera, nezlomiteľná medzera, úzka medzera, apostrof (CH formát)
  s = s.replace(/[\s  ']/g, "");
  if (!s) return NaN;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    // oba znaky → ten posledný je desatinný, ten druhý je oddeľovač tisícov
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandSep = decimalSep === "," ? "." : ",";
    s = s.split(thousandSep).join("").replace(decimalSep, ".");
  } else if (lastComma >= 0) {
    // "8,452" = 8452 (tisíce), "72,5" = 72.5 (desatinné) – rozlíš podľa počtu číslic za čiarkou
    const after = s.length - lastComma - 1;
    const multiple = s.split(",").length > 2;
    s = multiple || after === 3 ? s.split(",").join("") : s.replace(",", ".");
  } else if (lastDot >= 0) {
    const after = s.length - lastDot - 1;
    const multiple = s.split(".").length > 2;
    if (multiple || after === 3) s = s.split(".").join("");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function isIsoDay(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

async function handle(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams;
  const token =
    q.get("token") ||
    request.headers.get("x-workout-token") ||
    (request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");

  const userId = await userIdByToken(token);
  if (!userId) return NextResponse.json({ error: "Neplatný token." }, { status: 401 });

  const body =
    request.method === "POST"
      ? ((await request.json().catch(() => null)) as Record<string, unknown> | null)
      : null;
  const pick = (k: string): unknown => (body && body[k] != null ? body[k] : q.get(k));

  const kcalVal = pick("kcal");
  const stepsVal = pick("steps");
  const kcal = parseNumberLoose(kcalVal);
  const steps = parseNumberLoose(stepsVal);
  const hasKcal = Number.isFinite(kcal) && kcal > 0 && kcal <= 10000;
  const hasSteps = Number.isFinite(steps) && steps >= 0 && steps <= 200000;

  if (!hasKcal && !hasSteps) {
    // Zrozumiteľná chyba – v Skratkách je vidno telo odpovede, takže sa dá hneď zistiť,
    // že premenná zo Zdravia prišla prázdna / v nečakanom tvare.
    return NextResponse.json(
      {
        error: "Chýba (alebo sa nedá prečítať) kcal alebo steps.",
        received: { kcal: kcalVal ?? null, steps: stepsVal ?? null },
        hint: "V Skratke musí byť do URL vložená PREMENNÁ s číslom (Zdravie → Získať vzorky → Vypočítať štatistiku → Súčet).",
      },
      { status: 400 },
    );
  }

  // Deň sa dá poslať explicitne (&date=2026-11-14) – napr. pri nočnom dosyncovaní včerajška.
  const occVal = pick("date") ?? pick("occurredAt");
  const occurredAt = occVal != null ? String(occVal) : null;
  const dayStr = occurredAt && isIsoDay(occurredAt.slice(0, 10)) ? occurredAt.slice(0, 10) : undefined;

  const result: { ok: true; date: string; kcal?: number; steps?: number } = {
    ok: true,
    date: dayStr ?? bratislavaDate(),
  };

  if (hasKcal) {
    const typeVal = pick("type") ?? pick("workoutType");
    const workoutType = typeVal != null ? String(typeVal) : null;
    const burn = await upsertWatchBurn(userId, { kcal, workoutType, occurredAt });
    result.kcal = burn.kcal;
  }

  if (hasSteps) {
    result.steps = await setSteps(userId, steps, dayStr);
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return handle(request);
}
export async function GET(request: Request) {
  return handle(request);
}
