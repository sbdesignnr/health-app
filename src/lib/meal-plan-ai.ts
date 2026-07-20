import { anthropic } from "./anthropic";
import { prisma } from "./prisma";
import { getEnergyBreakdown, type DailyTargets } from "./goals";
import { getDayEvents } from "./schedule";
import { getWeather } from "./weather";
import { NUTRITION_KNOWLEDGE } from "./expert-knowledge";
import { listFavorites, recentMealCounts } from "./favorites";
import { checkinSummary, getCheckin } from "./checkin";
import { getWeekLoad, TYPE_LABEL_SK } from "./weekly-load";

const MODEL = "claude-sonnet-4-6";
const MEAL_TYPES = ["BREAKFAST", "MORNING_SNACK", "LUNCH", "AFTERNOON_SNACK", "DINNER"];

export type AiIngredient = { name: string; grams: number };

export type AiMealItem = {
  mealType: string;
  name: string;
  description: string;
  timeOfDay: string;
  ingredients: AiIngredient[];
  recipe: string[];
  portionG: number;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type AiSupplement = { name: string; timing: string; reason: string };

export type AiPlanResult = {
  items: AiMealItem[];
  dailyTip: string;
  supplementPlan: AiSupplement[];
  context: string;
  model: string;
  targets: DailyTargets;
};

const INGREDIENT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "surovina po slovensky" },
    grams: { type: "number", description: "gramáž tejto suroviny" },
  },
  required: ["name", "grams"],
  additionalProperties: false,
};

const ITEM_PROPS = {
  mealType: { type: "string", enum: MEAL_TYPES },
  name: { type: "string", description: "názov jedla po slovensky" },
  description: {
    type: "string",
    description:
      "chutný, ŠŤAVNATÝ popis vrátane omáčky/dresingu/korenín a spôsobu prípravy – nikdy nie suché jedlo",
  },
  timeOfDay: {
    type: "string",
    description:
      "čas jedla vo formáte HH:MM podľa fyziológie (prvé jedlo min. 60 min po zobudení, rozostupy 2.5–3.5 h, posledné min. 2–3 h pred spaním)",
  },
  ingredients: {
    type: "array",
    items: INGREDIENT_SCHEMA,
    description: "zoznam surovín s gramážou – aby bolo jasné koľko čoho dať",
  },
  recipe: {
    type: "array",
    items: { type: "string" },
    description: "postup prípravy krok po kroku (stručné, jasné kroky vrátane korenín/omáčky), aby jedlo bolo naozaj chutné",
  },
  portionG: { type: "number", description: "celková hmotnosť porcie v gramoch (≈ súčet surovín)" },
  caloriesKcal: { type: "number", description: "kcal pre túto porciu" },
  proteinG: { type: "number" },
  carbsG: { type: "number" },
  fatG: { type: "number" },
};
const ITEM_REQUIRED = [
  "mealType",
  "name",
  "description",
  "timeOfDay",
  "ingredients",
  "recipe",
  "portionG",
  "caloriesKcal",
  "proteinG",
  "carbsG",
  "fatG",
];

const SUPP_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "názov doplnku" },
    timing: { type: "string", description: "kedy si ho vziať (napr. ráno s jedlom, po tréningu, pred spaním)" },
    reason: { type: "string", description: "prečo v tomto čase – stručne" },
  },
  required: ["name", "timing", "reason"],
  additionalProperties: false,
};

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    meals: {
      type: "array",
      items: { type: "object", properties: ITEM_PROPS, required: ITEM_REQUIRED, additionalProperties: false },
    },
    dailyTip: {
      type: "string",
      description:
        "jeden konkrétny dnešný odkaz na mieru (napr. „Dnes si daj kefír, lebo…“ alebo „Dnes uber sacharidy večer, lebo…“) – cielený na jeho stav, tréning a počasie",
    },
    supplementPlan: {
      type: "array",
      items: SUPP_SCHEMA,
      description: "plán doplnkov na dnes – primárne z tých, ktoré užíva; kedy a prečo",
    },
  },
  required: ["meals", "dailyTip", "supplementPlan"],
  additionalProperties: false,
};

const SINGLE_SCHEMA = {
  type: "object",
  properties: ITEM_PROPS,
  required: ITEM_REQUIRED,
  additionalProperties: false,
};

const SYSTEM = `Si špičkový športový nutričný špecialista a zároveň fyziológ. Zostavuješ realistický, CHUTNÝ denný jedálniček na mieru pre slovenského športovca (futbal + posilňovňa).

VÝSTUP:
- 5 jedál, každé práve raz: raňajky (BREAKFAST), desiata (MORNING_SNACK), obed (LUNCH), olovrant (AFTERNOON_SNACK), večera (DINNER).
- Ku KAŽDÉMU jedlu daj: presný čas (timeOfDay), rozpis surovín s gramážou (ingredients), postup prípravy krok po kroku (recipe – stručné jasné kroky vrátane korenín/omáčky, aby to bolo chutné), celkovú porciu (portionG) a makrá pre porciu.
- Súčet kalórií a makier zo VŠETKÝCH jedál musí sedieť na cieľové hodnoty (odchýlka do ~5 %).
- Navyše vráť dailyTip (jeden konkrétny dnešný odkaz) a supplementPlan (kedy a prečo si vziať doplnky).

ČASOVANIE JEDÁL – FYZIOLÓGIA (prísne dodrž):
- Prvé jedlo NAJSKÔR ~60 minút po zobudení – telo hneď po spánku nedokáže dobre jesť. Nikdy skôr.
- Rozostupy medzi jedlami 2.5–3.5 h.
- Posledné jedlo minimálne 2–3 h pred spaním (kvalitný spánok a trávenie).
- Okolo tréningu: 1–2 h pred tréningom ľahšie stráviteľné sacharidy + bielkovina; do 1–2 h po tréningu bielkovina + sacharidy na regeneráciu.
- Ak nie je uvedený čas budenia/spánku, predpokladaj budenie 7:30 a spánok 23:00.

CHUŤ (kľúčové – používateľ NEZNÁŠA suché jedlá a potrpí si na dobrom jedle):
- Jedlá musia byť reálne chutné a ŠŤAVNATÉ. Vždy pridaj omáčku/dresing/zdravý tuk/koreniny, aby to nebolo suché.
- Realistické, bežne dostupné na Slovensku, dá sa to reálne uvariť aj zjesť v danom množstve.

ZDRAVIE NA MIERU (cielene zaraď potraviny podľa jeho problémov):
- koža / vyrážky → omega-3, zinok, vitamín A a C, menej rafinovaného cukru a prípadne menej mliečneho.
- vypadávanie vlasov → dostatok bielkovín, železo, biotín, zinok.
- spánok / stres → magnézium, tryptofán (napr. tvaroh večer), banán; večer skôr komplexné sacharidy.
- trávenie → fermentované (kefír, jogurt, kyslá kapusta), vláknina, dosť tekutín.
- nízka energia → železo, komplexné sacharidy, vitamín B12.
- Zohľadni psychický stav a kvalitu spánku.

DOPLNKY:
- V supplementPlan urči pre KAŽDÝ doplnok, ktorý užíva, ideálny čas a stručný dôvod (kreatín – kedykoľvek denne; omega-3 – k jedlu s tukom; magnézium – večer pred spaním; vitamín D3 – ráno k tuku; srvátkový proteín – po tréningu…).
- Ak pre jeho problém niečo zjavne chýba, jemne to odporuč v dailyTip.

ROTÁCIA A OBĽÚBENÉ JEDLÁ (KĽÚČOVÉ PRAVIDLO):
- Jedálniček zostav VÝHRADNE z jeho OBĽÚBENÝCH JEDÁL uvedených v kontexte (vrátane smoothie). NEVYMÝŠĽAJ nové jedlá mimo zoznamu.
- Pole "name" musí byť PRESNÝ názov obľúbeného jedla (kvôli sledovaniu rotácie).
- ROTÁCIA: to isté jedlo nedávaj viac než 2× za týždeň. Rešpektuj limit „max za týždeň“, ak ho jedlo má.
- PORCIE prispôsob dennej potrebe: tréningový deň = väčšie porcie sacharidov, voľný/regeneračný deň = menej sacharidov a viac zdravých tukov. Prepočítaj gramáže surovín aj makrá podľa upravenej porcie.
- Ak má surovina uvedený obchod (napr. med → Yeme), spomeň to v popise jedla.
- Prísne rešpektuj PRAVIDLÁ NÁKUPU A ROTÁCIE z kontextu (obchody, rozpočet, zakázané jedlá, cheat meal).
- Ak je obľúbených jedál málo na pokrytie cieľa, radšej uprav porcie – nepridávaj cudzie jedlá.

${NUTRITION_KNOWLEDGE}

OSTATNÉ:
- NIKDY nezaraď nič z alergií. Rešpektuj typ stravy aj „nemám rád / nejem“.
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

function ageFrom(birth: Date | null | undefined): number | null {
  if (!birth) return null;
  const now = new Date();
  let a = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) a--;
  return a >= 0 && a < 130 ? a : null;
}

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

  // Reštaurácie + dnes platné menu.
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
  const age = ageFrom(user?.birthDate ?? null);

  const lines: string[] = [];
  lines.push(`DÁTUM: ${dateStr} (${SK_DAYS[dow]})`);
  lines.push("");
  lines.push("PROFIL:");
  lines.push(
    `- Vek: ${age ?? "?"} r., Výška: ${user?.heightCm ?? "?"} cm, Váha: ${user?.currentWeightKg ?? "?"} kg, Pohlavie: ${
      user?.sex === "MALE" ? "muž" : user?.sex === "FEMALE" ? "žena" : "?"
    }`,
  );
  lines.push(`- Cieľ: ${GOAL_SK[breakdown.goalType] ?? breakdown.goalType}`);
  lines.push("");
  lines.push("REŽIM DŇA (podľa toho urči časy jedál):");
  lines.push(`- Budenie: ${user?.wakeTime || "neuvedené (predpokladaj 7:30)"}, Spánok: ${user?.sleepTime || "neuvedené (predpokladaj 23:00)"}`);
  lines.push(
    `- Kvalita spánku (1–5): ${user?.sleepQuality ?? "?"}, Subjektívny stres (1–5): ${user?.stressLevel ?? "?"}`,
  );
  lines.push("");
  lines.push("ZDRAVIE (rob jedlá cielene na tieto veci):");
  lines.push(`- Problémy/zameranie: ${user?.healthConcerns?.length ? user.healthConcerns.join(", ") : "žiadne uvedené"}`);
  lines.push(`- Poznámky (psychika/stav): ${user?.healthNotes?.trim() || "—"}`);
  lines.push("");
  lines.push("DOPLNKY (naplánuj v supplementPlan kedy a prečo):");
  lines.push(`- Užíva: ${user?.supplements?.length ? user.supplements.join(", ") : "žiadne uvedené"}`);
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
  lines.push(`- Obľúbené (rád zaradí): ${user?.likes?.length ? user.likes.join(", ") : "—"}`);
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

  // ── Fáza 12: obľúbené jedlá, rotácia, check-in, dnešná záťaž ──
  const [favorites, recentCounts, checkin, week] = await Promise.all([
    listFavorites(userId),
    recentMealCounts(userId),
    getCheckin(userId, dateStr),
    getWeekLoad(userId, dateStr),
  ]);

  const today = week.days.find((d) => d.date === dateStr);
  lines.push("");
  lines.push("DNEŠNÁ ZÁŤAŽ (podľa nej periodizuj sacharidy a timing):");
  if (!today || today.activities.length === 0) {
    lines.push("- voľný / regeneračný deň → nižšie sacharidy, rovnaké bielkoviny, viac zdravých tukov");
  } else {
    for (const a of today.activities) {
      lines.push(
        `- ${TYPE_LABEL_SK[a.type] ?? a.type}${a.startTime ? ` o ${a.startTime}` : ""}, ${a.minutes} min, RPE ${a.rpe}`,
      );
    }
    lines.push(`- denná záťaž (RPE × min): ${today.dayLoad}`);
  }

  // Zajtrajší zápas → dnes carb loading.
  const tomorrow = week.days.find((d) => {
    const t = new Date(`${dateStr}T12:00:00Z`);
    t.setUTCDate(t.getUTCDate() + 1);
    return d.date === t.toISOString().slice(0, 10);
  });
  if (tomorrow?.activities.some((a) => a.type === "MATCH")) {
    lines.push("- ZAJTRA JE ZÁPAS → dnes CARB LOADING (6–8 g sacharidov/kg, nízky tuk a vláknina).");
  }

  lines.push("");
  lines.push(`RANNÝ CHECK-IN: ${checkinSummary(checkin)}`);

  lines.push("");
  lines.push("PRAVIDLÁ NÁKUPU A ROTÁCIE (prísne dodrž):");
  lines.push(user?.foodRules?.trim() || "- neuvedené");

  lines.push("");
  lines.push("OBĽÚBENÉ JEDLÁ – POUŽI VÝHRADNE TIETO (názov musí sedieť presne):");
  if (favorites.length === 0) {
    lines.push("- zatiaľ žiadne (použi bežné slovenské jedlá a odporuč doplniť obľúbené v Profile)");
  } else {
    for (const f of favorites.filter((x) => x.active)) {
      const ing = (f.ingredients ?? [])
        .map((i) => `${i.name} ${Math.round(i.grams)} g${i.shop ? ` [${i.shop}]` : ""}`)
        .join(", ");
      const used = recentCounts[f.name.toLowerCase()] ?? 0;
      const limits = [
        f.maxPerWeek ? `max ${f.maxPerWeek}×/týž.` : null,
        used > 0 ? `za 7 dní použité ${used}×` : null,
        f.note ?? null,
      ]
        .filter(Boolean)
        .join(" · ");
      lines.push(
        `- ${f.name} [${f.mealTypes.join("/") || "—"}] – ${Math.round(f.caloriesKcal)} kcal, B${Math.round(
          f.proteinG,
        )}/S${Math.round(f.carbsG)}/T${Math.round(f.fatG)}, porcia ${Math.round(f.portionG ?? 0)} g, ${
          f.prepMinutes ?? "?"
        } min, ${f.priceEur ?? "?"} €${limits ? ` — ${limits}` : ""}`,
      );
      if (ing) lines.push(`    suroviny: ${ing}`);
    }
  }

  return { contextString: lines.join("\n"), targets: t };
}

function firstText(content: { type: string; text?: string }[]): string {
  const block = content.find((b) => b.type === "text");
  if (!block || block.type !== "text" || !block.text) throw new Error("AI nevrátilo odpoveď.");
  return block.text;
}

export async function generatePlan(userId: string, dateStr: string): Promise<AiPlanResult> {
  const { contextString, targets } = await gatherContext(userId, dateStr);

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: PLAN_SCHEMA } },
    messages: [{ role: "user", content: `${contextString}\n\nZostav jedálniček na tento deň.` }],
  });

  if (res.stop_reason === "refusal") throw new Error("AI odmietlo požiadavku.");
  const parsed = JSON.parse(firstText(res.content)) as {
    meals: AiMealItem[];
    dailyTip: string;
    supplementPlan: AiSupplement[];
  };
  return {
    items: parsed.meals,
    dailyTip: parsed.dailyTip,
    supplementPlan: parsed.supplementPlan ?? [],
    context: contextString,
    model: MODEL,
    targets,
  };
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
    `Dodrž časovanie aj rozpis surovín s gramážou. Vráť práve jedno jedlo typu ${mealType}.`;

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SINGLE_SCHEMA } },
    messages: [{ role: "user", content: prompt }],
  });

  if (res.stop_reason === "refusal") throw new Error("AI odmietlo požiadavku.");
  const item = JSON.parse(firstText(res.content)) as AiMealItem;
  item.mealType = mealType; // poistka
  return item;
}
