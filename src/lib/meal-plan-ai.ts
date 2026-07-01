import { anthropic } from "./anthropic";
import { prisma } from "./prisma";
import { getEnergyBreakdown, type DailyTargets } from "./goals";
import { getDayEvents } from "./schedule";
import { getWeather } from "./weather";

const MODEL = "claude-sonnet-4-6";
const MEAL_TYPES = ["BREAKFAST", "MORNING_SNACK", "LUNCH", "AFTERNOON_SNACK", "DINNER"];

export type AiMealItem = {
  mealType: string;
  name: string;
  description: string;
  portionG: number;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

const ITEM_PROPS = {
  mealType: { type: "string", enum: MEAL_TYPES },
  name: { type: "string", description: "názov jedla po slovensky" },
  description: { type: "string", description: "stručný popis / hlavné suroviny" },
  portionG: { type: "number", description: "veľkosť porcie v gramoch" },
  caloriesKcal: { type: "number", description: "kcal pre túto porciu" },
  proteinG: { type: "number" },
  carbsG: { type: "number" },
  fatG: { type: "number" },
};
const ITEM_REQUIRED = [
  "mealType",
  "name",
  "description",
  "portionG",
  "caloriesKcal",
  "proteinG",
  "carbsG",
  "fatG",
];

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    meals: {
      type: "array",
      items: { type: "object", properties: ITEM_PROPS, required: ITEM_REQUIRED, additionalProperties: false },
    },
  },
  required: ["meals"],
  additionalProperties: false,
};

const SINGLE_SCHEMA = {
  type: "object",
  properties: ITEM_PROPS,
  required: ITEM_REQUIRED,
  additionalProperties: false,
};

const SYSTEM = `Si skúsený športový nutričný špecialista. Zostavuješ realistické denné jedálničky pre slovenského športovca (futbal + posilňovňa).
Pravidlá:
- 5 jedál, každé práve raz: raňajky (BREAKFAST), desiata (MORNING_SNACK), obed (LUNCH), olovrant (AFTERNOON_SNACK), večera (DINNER).
- Súčet kalórií a makier zo všetkých jedál musí sedieť na cieľové hodnoty (odchýlka do ~5 %).
- Jedlá reálne, bežne dostupné na Slovensku, s presnými porciami v gramoch a makrami pre danú porciu.
- NIKDY nezaraď nič z alergií. Rešpektuj typ stravy aj "nemám rád".
- Obmieňaj oproti histórii posledných dní – neopakuj tie isté jedlá dookola.
- Zohľadni tréning: pred/po tréningu sacharidovo bohatšie jedlo a dostatok bielkovín.
- Zohľadni počasie: pri horúčave ľahšie, hydratujúce jedlá.
- Odpovedaj VÝHRADNE cez štruktúrovanú schému (žiadny voľný text).`;

const SK_DAYS = ["nedeľa", "pondelok", "utorok", "streda", "štvrtok", "piatok", "sobota"];
const GOAL_SK: Record<string, string> = {
  LOSE_FAT: "chudnutie",
  GAIN_MUSCLE: "naberanie svalov",
  MAINTAIN_PERFORMANCE: "udržanie + výkon",
  CUSTOM: "vlastný",
};
const EVENT_SK: Record<string, string> = {
  FOOTBALL_TRAINING: "futbal tréning",
  GYM: "posilňovňa",
  MATCH: "zápas",
  REST: "voľno",
  CUSTOM: "iné",
};

type GatheredContext = { contextString: string; targets: DailyTargets };

async function gatherContext(userId: string, dateStr: string): Promise<GatheredContext> {
  const [user, breakdown, events, weather] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    getEnergyBreakdown(userId, dateStr),
    getDayEvents(userId, dateStr),
    getWeather(),
  ]);

  // História posledných 7 dní (názvy jedál – aby sa AI neopakovalo).
  const since = new Date(`${dateStr}T00:00:00Z`);
  since.setUTCDate(since.getUTCDate() - 7);
  const recentLogs = await prisma.foodLog.findMany({
    where: { userId, loggedAt: { gte: since } },
    include: { food: { select: { name: true } } },
    orderBy: { loggedAt: "desc" },
    take: 80,
  });
  const recentNames = [...new Set(recentLogs.map((l) => l.food.name))].slice(0, 30);

  // Reštaurácie + dnes platné menu (Fáza 7; teraz typicky prázdne).
  const dateAsDate = new Date(`${dateStr}T00:00:00Z`);
  const restaurants = await prisma.restaurant.findMany({
    where: { userId },
    include: {
      menus: {
        where: {
          validFrom: { lte: dateAsDate },
          OR: [{ validTo: null }, { validTo: { gte: dateAsDate } }],
        },
        include: { items: true },
      },
    },
  });

  const t = breakdown.targets;
  const dow = new Date(`${dateStr}T12:00:00Z`).getUTCDay();

  const lines: string[] = [];
  lines.push(`DÁTUM: ${dateStr} (${SK_DAYS[dow]})`);
  lines.push("");
  lines.push("PROFIL:");
  lines.push(
    `- Výška: ${user?.heightCm ?? "?"} cm, Váha: ${user?.currentWeightKg ?? "?"} kg, Pohlavie: ${
      user?.sex === "MALE" ? "muž" : user?.sex === "FEMALE" ? "žena" : "?"
    }`,
  );
  lines.push(`- Cieľ: ${GOAL_SK[breakdown.goalType] ?? breakdown.goalType}`);
  lines.push("");
  lines.push("DENNÉ CIELE (súčet jedál ich musí dosiahnuť):");
  lines.push(`- Kalórie: ${t.caloriesKcal} kcal`);
  lines.push(`- Bielkoviny: ${t.proteinG} g, Sacharidy: ${t.carbsG} g, Tuky: ${t.fatG} g`);
  if (breakdown.tdee) {
    lines.push(
      `- (TDEE ${breakdown.tdee} kcal = BMR ${breakdown.bmr} + aktivita + tréningy ${breakdown.trainingKcal} kcal)`,
    );
  }
  lines.push("");
  lines.push("STRAVA:");
  lines.push(`- Typ: ${user?.dietType || "bez obmedzenia"}`);
  lines.push(`- Alergie (NIKDY nezaraď): ${user?.allergies?.length ? user.allergies.join(", ") : "žiadne"}`);
  lines.push(`- Nemám rád / nejem: ${user?.dislikes?.length ? user.dislikes.join(", ") : "—"}`);
  lines.push("");
  lines.push("ROZVRH DNES (uprav timing a sacharidy okolo tréningu):");
  const trainings = events.filter((e) => e.type !== "REST");
  if (trainings.length === 0) {
    lines.push("- žiadny tréning");
  } else {
    for (const e of trainings) {
      lines.push(
        `- ${EVENT_SK[e.type] ?? e.type}${e.startTime ? ` o ${e.startTime}` : ""}${
          e.durationMin ? `, ${e.durationMin} min` : ""
        }, intenzita ${e.intensity}${e.gymFocus ? `, ${e.gymFocus}` : ""}`,
      );
    }
  }
  lines.push("");
  if (weather) {
    lines.push("POČASIE (Nitra):");
    lines.push(
      `- ${Math.round(weather.current.tempC)} °C, pocitovo ${Math.round(weather.current.feelsLikeC)} °C, denné max ${Math.round(weather.daily.maxTempC)} °C, UV ${Math.round(weather.daily.uvMax)}`,
    );
    lines.push("");
  }
  lines.push("HISTÓRIA (posledných 7 dní – NEOPAKUJ tieto jedlá dookola):");
  lines.push(recentNames.length ? `- ${recentNames.join(", ")}` : "- žiadna história");
  lines.push("");
  lines.push("REŠTAURÁCIE (ak by sedeli na obed vonku):");
  const menuLines: string[] = [];
  for (const r of restaurants) {
    for (const m of r.menus) {
      for (const it of m.items) {
        if (it.dayOfWeek != null && it.dayOfWeek !== dow) continue; // len dnešné / celotýždenné
        const macros =
          it.caloriesKcal != null
            ? ` (~${Math.round(it.caloriesKcal)} kcal, B${Math.round(it.proteinG ?? 0)}/S${Math.round(it.carbsG ?? 0)}/T${Math.round(it.fatG ?? 0)})`
            : "";
        menuLines.push(`- ${r.name}: ${it.name}${it.priceEur ? ` ${it.priceEur} €` : ""}${macros}`);
      }
    }
  }
  lines.push(menuLines.length ? menuLines.join("\n") : "- žiadne uložené menu");

  return { contextString: lines.join("\n"), targets: t };
}

function parseItem(text: string): AiMealItem {
  return JSON.parse(text) as AiMealItem;
}

function firstText(content: { type: string; text?: string }[]): string {
  const block = content.find((b) => b.type === "text");
  if (!block || block.type !== "text" || !block.text) throw new Error("AI nevrátilo odpoveď.");
  return block.text;
}

export async function generatePlan(
  userId: string,
  dateStr: string,
): Promise<{ items: AiMealItem[]; context: string; model: string; targets: DailyTargets }> {
  const { contextString, targets } = await gatherContext(userId, dateStr);

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: PLAN_SCHEMA } },
    messages: [{ role: "user", content: `${contextString}\n\nZostav jedálniček na tento deň.` }],
  });

  if (res.stop_reason === "refusal") throw new Error("AI odmietlo požiadavku.");
  const parsed = JSON.parse(firstText(res.content)) as { meals: AiMealItem[] };
  return { items: parsed.meals, context: contextString, model: MODEL, targets };
}

export async function generateSingleMeal(
  userId: string,
  dateStr: string,
  mealType: string,
  otherMeals: AiMealItem[],
  avoidName: string,
): Promise<AiMealItem> {
  const { contextString, targets } = await gatherContext(userId, dateStr);

  const used = otherMeals.reduce(
    (a, m) => ({
      kcal: a.kcal + m.caloriesKcal,
      p: a.p + m.proteinG,
      c: a.c + m.carbsG,
      f: a.f + m.fatG,
    }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );
  const remaining = {
    kcal: Math.max(0, targets.caloriesKcal - used.kcal),
    p: Math.max(0, targets.proteinG - used.p),
    c: Math.max(0, targets.carbsG - used.c),
    f: Math.max(0, targets.fatG - used.f),
  };

  const prompt =
    `${contextString}\n\n` +
    `Vymeň jedlo typu ${mealType}. Ostatné jedlá ostávajú (${otherMeals
      .map((m) => m.name)
      .join(", ")}).\n` +
    `Navrhni INÉ jedlo než "${avoidName}". Cieľ pre toto jedlo (zvyšok denného rozpočtu): ` +
    `~${Math.round(remaining.kcal)} kcal, ${Math.round(remaining.p)} g B, ${Math.round(remaining.c)} g S, ${Math.round(remaining.f)} g T.\n` +
    `Vráť práve jedno jedlo typu ${mealType}.`;

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SINGLE_SCHEMA } },
    messages: [{ role: "user", content: prompt }],
  });

  if (res.stop_reason === "refusal") throw new Error("AI odmietlo požiadavku.");
  const item = parseItem(firstText(res.content));
  item.mealType = mealType; // poistka
  return item;
}
