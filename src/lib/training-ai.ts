import { anthropic } from "./anthropic";
import { getWeather, weatherDescription } from "./weather";
import { getGymSplitForPhase } from "./gym-split";
import { prisma } from "./prisma";
import { TRAINING_KNOWLEDGE } from "./expert-knowledge";
import { getWeekLoad, weekSummaryForAi } from "./weekly-load";
import { checkinSummary, getCheckin } from "./checkin";

const MODEL = "claude-sonnet-4-6";

export type AiExercise = {
  name: string;
  warmupSets: number;
  sets: number;
  reps: string;
  intensity: string;
  restSec: number;
  notes: string;
  rationale: string;
};
export type AiDay = {
  title: string;
  focus: string;
  dayOfWeek: number;
  estimatedDurationMin: number;
  estimatedRpe: number;
  exercises: AiExercise[];
};
export type AiProgram = {
  phase: string;
  summary: string;
  reviewAfterDays: number;
  guidance: string[];
  days: AiDay[];
};

const REVIEW_PROP = {
  reviewAfterDays: {
    type: "integer",
    description: "po koľkých dňoch má hráč plán obnoviť (podľa fázy, typicky 14–28)",
  },
  guidance: {
    type: "array",
    items: { type: "string" },
    description:
      "odporúčania ako postupovať; ak je uvedená bolesť/zranenie: najpravdepodobnejšia príčina, ako sa k tomu postaviť, čím regenerovať a KEDY vyhľadať lekára (NIE je to lekárska diagnóza)",
  },
};

const EX_PROPS = {
  name: { type: "string", description: "názov cviku po slovensky" },
  warmupSets: {
    type: "integer",
    description: "počet ROZCVIČOVACÍCH sérií (ľahšia váha, postupné nabaľovanie) – typicky 1–2, pri ľahkých/izolovaných cvikoch môže byť 0",
  },
  sets: { type: "integer", description: "počet PRACOVNÝCH sérií (hlavná záťaž) – rešpektuj presne požadovaný počet z kontextu" },
  reps: { type: "string", description: "opakovania na pracovnú sériu, napr. '8–10', '5' alebo 'AMRAP'" },
  intensity: { type: "string", description: "intenzita, napr. 'RPE 8', '75 % 1RM' alebo 'stredná'" },
  restSec: { type: "integer", description: "odpočinok medzi sériami v sekundách" },
  notes: { type: "string", description: "krátka poznámka k technike alebo prevedeniu (môže byť prázdna)" },
  rationale: {
    type: "string",
    description: "1 veta PREČO presne tento cvik – viaž na jeho cieľ/post/slabiny/zranenia, nie všeobecná fráza",
  },
};
const EX_REQUIRED = ["name", "warmupSets", "sets", "reps", "intensity", "restSec", "notes", "rationale"];

const DAY_COORD_PROPS = {
  dayOfWeek: { type: "integer", description: "0=nedeľa,1=pondelok,...,6=sobota – presný deň, kedy sa tento tréning odohrá" },
  estimatedDurationMin: { type: "integer", description: "odhadované trvanie celého tréningu v minútach" },
  estimatedRpe: { type: "integer", description: "odhadovaná celková náročnosť tréningu 1–10 (RPE)" },
};
const DAY_PROPS = {
  title: { type: "string", description: "názov dňa, napr. 'Deň 1 – Dolná časť (sila)'" },
  focus: { type: "string", description: "krátke zameranie dňa" },
  ...DAY_COORD_PROPS,
  exercises: {
    type: "array",
    items: { type: "object", properties: EX_PROPS, required: EX_REQUIRED, additionalProperties: false },
  },
};
const DAY_REQUIRED = ["title", "focus", "dayOfWeek", "estimatedDurationMin", "estimatedRpe", "exercises"];

const PROGRAM_SCHEMA = {
  type: "object",
  properties: {
    phase: { type: "string", description: "aktuálna tréningová fáza, napr. 'Predsezóna – budovanie sily'" },
    summary: { type: "string", description: "2–3 vety: zameranie programu a ako pomáha futbalu v tejto fáze" },
    ...REVIEW_PROP,
    days: {
      type: "array",
      items: { type: "object", properties: DAY_PROPS, required: DAY_REQUIRED, additionalProperties: false },
    },
  },
  required: ["phase", "summary", "reviewAfterDays", "guidance", "days"],
  additionalProperties: false,
};

const SYSTEM = `Si špičkový kondičný tréner (strength & conditioning) pre futbalistov. Tvoríš gym program na mieru, ktorý buduje svalovú hmotu a silu, ALE zároveň zlepšuje futbalový výkon (výbušnosť, rýchlosť, stabilita, prevencia zranení).

PERIODIZÁCIA PODĽA FÁZY (kľúčové – urči fázu z dátumov a z poľa SEZÓNNA FÁZA v kontexte):
- Prípravné obdobie / predsezóna (aj MEDZISEZÓNNA PRESTÁVKA na jej začiatku): väčší objem, budovanie sily a hypertrofie, viac záťaže na nohy, plus rozvoj výbušnosti. Dlhšia prestávka (viac týždňov do reštartu ligy) = viac priestoru na objem/hypertrofiu.
- Posledné 2–4 týždne PRESTÁVKY pred reštartom ligy: postupne znižuj objem a presúvaj dôraz na výbušnosť/rýchlosť/silu blízku zápasovému tempu (nie už čisté naberanie objemu).
- Blízko dôležitého zápasu (napr. pohár): zníž objem, udrž intenzitu, odľahči nohy 2–3 dni pred zápasom (tapering).
- Sezóna (in-season): udržiavací režim, menší objem, dôraz na silu/výbušnosť a regeneráciu, aby tréning nezhoršil zápasový výkon.

PRAVIDLÁ:
- Ak je v kontexte "POŽADOVANÝ ROZVRH GYMU" – to je PRESNÁ POŽIADAVKA používateľa, použi PRESNE tie dni a zamerania (žiadne pridávanie/uberanie dní, žiadna zmena zamerania). Inak urči počet tréningových dní podľa rozpočtu v sekcii KOORDINÁCIA TÝŽDENNÉHO PROGRAMU nižšie (nie podľa vlastného odhadu).
- NEDÁVAJ ťažké nohy tesne pred futbalovým tréningom/zápasom – rozlož záťaž podľa rozvrhu (ak POŽADOVANÝ ROZVRH GYMU existuje, používateľ toto už sám zohľadnil – len to rešpektuj).
- Futbalové TÍMOVÉ tréningy a zápasy z rozvrhu sú FIXNÉ – NEMEŇ ich. Gym dni rozvrhni na OSTATNÉ dni v týždni, podľa KOORDINÁCIE aj mimo dní, ktoré už zabral futbalový individuálny modul (ak nemáš POŽADOVANÝ ROZVRH GYMU).
- Ku každému gym dňu priraď KONKRÉTNY deň v týždni priamo do "title" (napr. "Pondelok – Dolná časť (sila)") AJ do štruktúrovaného poľa "dayOfWeek".
- Neuvádzaj konkrétne kalórie ani makrá – tie rieši samostatný jedálniček.
- Zaraď: viackĺbové cviky (drep, mŕtvy ťah, tlaky, príťahy), posteriorný reťazec (hamstringy, sedacie – dôležité pre šprint a prevenciu), unilaterálne cviky (výpady, bulharské drepy), výbušnosť/plyometria (pre futbal), core a prevenciu (členky, kolená).
- SÉRIE (prísne dodrž): ku každému cviku daj presný počet PRACOVNÝCH sérií z kontextu (pole "Pracovné série na cvik" – ak nie je uvedené, daj 2). K tomu 1–2 ROZCVIČOVACIE série (ľahšia váha, narastajúca) – pri ľahkých/izolovaných cvikoch 0–1. NEDÁVAJ viac pracovných sérií než je v kontexte – menej, kvalitnejších sérií je lepšie než veľký objem.
- Ku každému cviku: warmupSets, sets (pracovné), opakovania, intenzita (RPE alebo % 1RM), odpočinok, krátka poznámka k technike A rationale – prečo PRESNE tento cvik pomáha jeho cieľu/postu/slabinám (nie všeobecná fráza, napr. "bulharský drep – jednonohá sila a stabilita pre výbušný prvý krok na krídle, adresuje slabší odrazový krok").
- Prispôsob náročnosť skúsenostiam (trainingExperience) a pozícii.

AKTUÁLNY STAV / BOLESTI (ak je uvedený):
- PRISPÔSOB tréning – vynechaj alebo uprav pohyby, ktoré dráždia bolestivé miesto; zaraď vhodné rehab/mobilitné cviky.
- V "guidance" napíš: najpravdepodobnejšiu príčinu bolesti, ako sa k tomu postaviť (napr. odľahčenie, ľad, postupný návrat k záťaži), čím regenerovať, a KEDY vyhľadať lekára/fyzioterapeuta (opuch, ostrá bolesť, nezlepšuje sa). VŽDY dodaj, že to nie je lekárska diagnóza.

PLATNOSŤ:
- "reviewAfterDays" = po koľkých dňoch má plán obnoviť (podľa fázy, typicky 14–28; kratšie pri zranení alebo blízko zápasu).
- "guidance" = aj bez zranenia daj 2–4 konkrétne odporúčania, ako počas týchto dní postupovať a kedy niečo zmeniť.

- Názvy cvikov po slovensky. Odpovedaj VÝHRADNE cez štruktúrovanú schému.

${TRAINING_KNOWLEDGE}`;

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

type SeasonBreak = {
  inBreak: boolean;
  label: string;
  daysUntilNextSeason: number | null;
  breakLengthDays: number | null;
};

// Zistí, či je hráč práve v medzisezónnej prestávke, ako dlho ešte trvá a akého je typu
// (zimná/letná/iná) – podľa toho, aké mesiace prestávka reálne pokrýva, nie podľa pevného dátumu.
function describeSeasonBreak(
  todayStr: string,
  seasonEndDate: Date | null,
  nextSeasonStartDate: Date | null,
): SeasonBreak {
  const empty: SeasonBreak = { inBreak: false, label: "", daysUntilNextSeason: null, breakLengthDays: null };
  if (!seasonEndDate) return empty;

  const today = new Date(`${todayStr}T12:00:00Z`);
  if (today <= seasonEndDate) return empty;
  if (nextSeasonStartDate && today >= nextSeasonStartDate) return empty;

  const daysUntilNextSeason = nextSeasonStartDate
    ? Math.round((nextSeasonStartDate.getTime() - today.getTime()) / 86400000)
    : null;
  const breakLengthDays = nextSeasonStartDate
    ? Math.round((nextSeasonStartDate.getTime() - seasonEndDate.getTime()) / 86400000)
    : null;

  const months = new Set<number>();
  const stop = nextSeasonStartDate ?? new Date(seasonEndDate.getTime() + 60 * 86400000);
  for (
    const cursor = new Date(seasonEndDate);
    cursor <= stop;
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  ) {
    months.add(cursor.getUTCMonth());
  }
  const isWinter = [11, 0, 1].some((m) => months.has(m)); // dec, jan, feb
  const isSummer = [5, 6, 7].some((m) => months.has(m)); // jún, júl, aug
  const label =
    isWinter && !isSummer ? "zimná prestávka" : isSummer && !isWinter ? "letná prestávka" : "medzisezónna prestávka";

  return { inBreak: true, label, daysUntilNextSeason, breakLengthDays };
}

function ageFrom(birth: Date | null | undefined): number | null {
  if (!birth) return null;
  const now = new Date();
  let a = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) a--;
  return a >= 0 && a < 130 ? a : null;
}

async function gatherAthleteContext(
  userId: string,
  kind: "GYM" | "FOOTBALL",
  startDateStr?: string,
): Promise<string> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const start = startDateStr ?? todayStr;
  const startDow = new Date(`${start}T12:00:00Z`).getUTCDay();
  const selfOrigin = kind === "GYM" ? "AI_GYM" : "AI_FOOTBALL";
  const siblingOrigin = kind === "GYM" ? "AI_FOOTBALL" : "AI_GYM";
  const siblingLabel = kind === "GYM" ? "Futbal (individuálne)" : "Fitness (gym)";

  const [user, goal, events, siblingEvents] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.goal.findFirst({ where: { userId, validTo: null }, orderBy: { validFrom: "desc" } }),
    // Vlastné predošlé AI dni vynechávame – o chvíľu sa prepíšu, nemajú pôsobiť ako fixné.
    prisma.scheduleEvent.findMany({ where: { userId, origin: { not: selfOrigin } } }),
    prisma.scheduleEvent.findMany({ where: { userId, origin: siblingOrigin } }),
  ]);

  const lines: string[] = [];
  lines.push(`DNES: ${todayStr}`);
  lines.push(`PLÁN ZAČÍNA: ${start} (${SK_DAYS[startDow]}) – rozvrhni tréningy od tohto dňa.`);
  lines.push("");
  lines.push("PROFIL:");
  lines.push(
    `- Vek: ${ageFrom(user?.birthDate) ?? "?"} r., Výška: ${user?.heightCm ?? "?"} cm, Váha: ${user?.currentWeightKg ?? "?"} kg`,
  );
  lines.push(`- Cieľ: ${GOAL_SK[goal?.type ?? ""] ?? "udržanie + výkon"}`);
  lines.push(`- Skúsenosti v posilňovni: ${user?.trainingExperience || "neuvedené"}`);
  lines.push(`- Pracovné série na cvik (záväzné, ak neuvedené daj 2): ${user?.workingSetsPerExercise ?? 2}`);
  lines.push("");
  lines.push("FUTBAL:");
  lines.push(`- Liga: ${user?.footballLeague || "neuvedené"}, Post: ${user?.footballPosition || "neuvedené"}`);
  lines.push(
    `- Odohrané roky: ${user?.yearsPlaying ?? "?"}, Dĺžka zápasu: ${user?.matchMinutes ?? "?"} min, Silná noha: ${user?.dominantFoot || "?"}`,
  );
  lines.push(
    `- Začiatok aktuálnej časti sezóny: ${user?.seasonStartDate ? user.seasonStartDate.toISOString().slice(0, 10) : "neuvedené"}`,
  );
  lines.push(
    `- Koniec aktuálnej časti sezóny (posledný zápas): ${user?.seasonEndDate ? user.seasonEndDate.toISOString().slice(0, 10) : "neuvedené"}`,
  );
  lines.push(
    `- Ďalšia časť sezóny (liga) začína: ${user?.nextSeasonStartDate ? user.nextSeasonStartDate.toISOString().slice(0, 10) : "neuvedené"}`,
  );
  const breakInfo = describeSeasonBreak(
    todayStr,
    user?.seasonEndDate ?? null,
    user?.nextSeasonStartDate ?? null,
  );
  if (breakInfo.inBreak) {
    lines.push(
      `- SEZÓNNA FÁZA: V PRESTÁVKE (${breakInfo.label})${
        breakInfo.daysUntilNextSeason != null ? `, ${breakInfo.daysUntilNextSeason} dní do reštartu ligy` : ""
      }${breakInfo.breakLengthDays != null ? `, celková dĺžka prestávky ${breakInfo.breakLengthDays} dní` : ""}. ` +
        `Na začiatku dlhšej prestávky je priestor na väčší objem/budovanie základu, v posledných 2–4 týždňoch pred reštartom zvyšuj špecifickosť a tempo bližšie k zápasovému.`,
    );
  } else {
    lines.push(`- SEZÓNNA FÁZA: v sezóne / prebieha súťaž (nie prestávka).`);
  }
  lines.push("");
  lines.push("CIELE A FORMA (personalizuj presne podľa toho):");
  lines.push(`- Ciele do sezóny: ${user?.seasonGoals?.trim() || "neuvedené"}`);
  lines.push(`- Silné stránky: ${user?.strengths?.trim() || "neuvedené"}`);
  lines.push(`- Slabiny na zlepšenie (cielene ich adresuj): ${user?.weaknesses?.trim() || "neuvedené"}`);
  lines.push(`- Dlhodobé zranenia / obmedzenia (REŠPEKTUJ, obchádzaj): ${user?.injuries?.trim() || "žiadne uvedené"}`);
  lines.push(
    `- AKTUÁLNY STAV / bolesti TERAZ (prispôsob tréning + poraď v guidance): ${user?.currentStatus?.trim() || "v poriadku, bez bolestí"}`,
  );
  lines.push(`- Dostupné vybavenie: ${user?.gymEquipment?.trim() || "neuvedené (predpokladaj bežnú posilňovňu)"}`);
  lines.push("");

  // Rozvrh: pravidelné tréningy + najbližšie zápasy (na určenie fázy a rozloženie záťaže).
  const recurring = events.filter((e) => e.isRecurring);
  lines.push("PRAVIDELNÝ TÝŽDENNÝ ROZVRH (rozlož gym záťaž okolo toho):");
  if (recurring.length === 0) {
    lines.push("- neuvedený");
  } else {
    for (const e of recurring) {
      const day = e.dayOfWeek != null ? SK_DAYS[e.dayOfWeek] : "?";
      lines.push(
        `- ${day}: ${EVENT_SK[e.type] ?? e.type}${e.startTime ? ` o ${e.startTime}` : ""}${
          e.gymFocus ? ` (${e.gymFocus})` : ""
        }`,
      );
    }
  }
  lines.push("");

  const gymPhase = breakInfo.inBreak ? "BREAK" : "IN_SEASON";
  const gymTemplate = kind === "GYM" ? await getGymSplitForPhase(userId, gymPhase) : [];

  if (kind === "GYM" && gymTemplate.length > 0) {
    lines.push("POŽADOVANÝ ROZVRH GYMU (PRESNÁ POŽIADAVKA – nie návrh, dodrž presne):");
    lines.push(
      `- Toto je jeho vlastný rozvrh pre "${gymPhase === "BREAK" ? "obdobie prestávky" : "obdobie v sezóne"}" – vytvor PRESNE toľko dní, na PRESNE týchto dňoch, s PRESNE týmto zameraním. IGNORUJ rozpočet "extraTrainingDaysPerWeek" nižšie, tento rozvrh má prednosť.`,
    );
    for (const d of gymTemplate) {
      lines.push(`  - ${SK_DAYS[d.dayOfWeek]}: ${d.focus}`);
    }
    lines.push(
      `- Zameranie interpretuj bežne (napr. "Nohy" = dolná časť tela/posteriórny reťazec, "Vrch" = tlaky/príťahy/plecia/ruky + core). Rešpektuj presne, čo napísal, aj keby použil iný výraz (Push/Pull/Upper/Lower...).`,
    );
    lines.push("");
  } else {
    const totalExtraDays = user?.extraTrainingDaysPerWeek ?? 4;
    const remainingBudget = Math.max(1, totalExtraDays - siblingEvents.length);
    lines.push("KOORDINÁCIA TÝŽDENNÉHO PROGRAMU (dôležité – rešpektuj presne):");
    lines.push(
      `- Celkový rozpočet tréningov NAVYŠE mimo klubu/zápasu za týždeň: ${totalExtraDays}${
        user?.extraTrainingDaysPerWeek == null ? " (neuvedené, použitý predvolený)" : ""
      }`,
    );
    if (siblingEvents.length > 0) {
      lines.push(`- Modul "${siblingLabel}" už zabral z tohto rozpočtu tieto dni:`);
      for (const e of siblingEvents) {
        const day = e.dayOfWeek != null ? SK_DAYS[e.dayOfWeek] : "?";
        lines.push(`  - ${day}: ${e.title || e.gymFocus || "tréning"}`);
      }
    } else {
      lines.push(`- Modul "${siblingLabel}" zatiaľ nemá vygenerovaný žiadny deň.`);
    }
    lines.push(
      `- TENTO modul môže použiť NAJVIAC ${remainingBudget} deň/dni z rozpočtu. Pokiaľ možno, vyber INÉ dni ako "${siblingLabel}", aby sa záťaž v týždni rozložila rovnomerne a nestackovala na jeden deň.`,
    );
  }
  lines.push("");

  const upcomingMatches = events
    .filter((e) => !e.isRecurring && e.type === "MATCH" && e.date && e.date.toISOString().slice(0, 10) >= todayStr)
    .sort((a, b) => (a.date!.getTime() - b.date!.getTime()))
    .slice(0, 5);
  lines.push("NAJBLIŽŠIE ZÁPASY (podľa toho urči fázu a tapering):");
  if (upcomingMatches.length === 0) {
    lines.push("- žiadne naplánované");
  } else {
    for (const e of upcomingMatches) {
      lines.push(`- ${e.date!.toISOString().slice(0, 10)}: ${e.title || "zápas"}`);
    }
  }

  // ── Fáza 12: týždenná záťaž + ranný check-in ──
  const [week, checkin, weather] = await Promise.all([
    getWeekLoad(userId, start),
    getCheckin(userId, todayStr),
    getWeather(),
  ]);
  lines.push("");
  lines.push(weekSummaryForAi(week));
  lines.push("");
  lines.push(`RANNÝ CHECK-IN: ${checkinSummary(checkin)}`);
  lines.push(
    "Ak sú varovania alebo je check-in slabý (energia/spánok ≤ 2 alebo únava ≥ 4), ZNÍŽ objem a zaraď regeneráciu.",
  );

  if (weather) {
    const wd = weatherDescription(weather.current.weatherCode);
    lines.push("");
    lines.push(
      `POČASIE DNES (Nitra, pri generovaní plánu): ${wd.label} ${wd.icon}, ${Math.round(weather.current.tempC)} °C (pocitovo ${Math.round(weather.current.feelsLikeC)} °C), min/max dnes ${Math.round(weather.daily.minTempC)}/${Math.round(weather.daily.maxTempC)} °C, zrážky ${weather.daily.precipSum} mm.`,
    );
    lines.push(
      "Toto je AKTUÁLNE reálne počasie, nie len odhad podľa kalendára – použi ho na rozhodnutie o vonkajších aktivitách (viď pravidlá nižšie), nie generické 'je zima/leto'.",
    );
  }

  // Posledné zapísané váhy z gymu – AI z nich progresuje záťaž.
  const exLogs = await prisma.exerciseLog.findMany({
    where: { userId },
    orderBy: { loggedAt: "desc" },
    take: 80,
  });
  const latestByName = new Map<string, { w: number; r: number | null }>();
  for (const l of exLogs) {
    if (!latestByName.has(l.exerciseName)) latestByName.set(l.exerciseName, { w: l.weightKg, r: l.reps });
  }
  if (latestByName.size > 0) {
    lines.push("");
    lines.push("POSLEDNÉ ZAPÍSANÉ VÁHY (nadviaž a mierne progresuj, ak zvláda; použi PRESNE tieto cviky):");
    for (const [name, v] of latestByName) {
      lines.push(`- ${name}: ${v.w} kg${v.r ? ` × ${v.r}` : ""}`);
    }
  }

  return lines.join("\n");
}

function firstText(content: { type: string; text?: string }[]): string {
  const block = content.find((b) => b.type === "text");
  if (!block || block.type !== "text" || !block.text) throw new Error("AI nevrátilo odpoveď.");
  return block.text;
}

export async function generateGymProgram(
  userId: string,
  startDateStr?: string,
): Promise<{ program: AiProgram; context: string; model: string }> {
  const context = await gatherAthleteContext(userId, "GYM", startDateStr);

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: PROGRAM_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `${context}\n\nZostav gym program na mieru pre aktuálnu fázu. Urči fázu z dátumov (dnes, začiatok sezóny, najbližšie zápasy).`,
      },
    ],
  });

  if (res.stop_reason === "refusal") throw new Error("AI odmietlo požiadavku.");
  const program = JSON.parse(firstText(res.content)) as AiProgram;
  return { program, context, model: MODEL };
}

/* ── FUTBAL modul ─────────────────────────────────────── */

export type AiDrill = { name: string; detail: string };
export type AiFootballSession = {
  dayOfWeek: number;
  title: string;
  focus: string;
  estimatedDurationMin: number;
  estimatedRpe: number;
  drills: AiDrill[];
};
export type AiFootballPlan = {
  teamTrainingFocus: string[];
  individualSessions: AiFootballSession[];
  recoveryTips: string[];
};
export type AiFootballResult = {
  phase: string;
  summary: string;
  reviewAfterDays: number;
  guidance: string[];
  plan: AiFootballPlan;
};

const DRILL_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "názov cvičenia po slovensky" },
    detail: {
      type: "string",
      description:
        "DETAILNÝ postup ako to spraviť sám: série/opakovania/čas, presné prevedenie krok po kroku, na čo si dať pozor a čo to trénuje (aby to hráč vedel spraviť aj bez trénera)",
    },
  },
  required: ["name", "detail"],
  additionalProperties: false,
};
const SESSION_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "názov individuálneho tréningu" },
    focus: { type: "string", description: "krátke zameranie" },
    ...DAY_COORD_PROPS,
    drills: { type: "array", items: DRILL_SCHEMA },
  },
  required: ["title", "focus", "dayOfWeek", "estimatedDurationMin", "estimatedRpe", "drills"],
  additionalProperties: false,
};
const FOOTBALL_SCHEMA = {
  type: "object",
  properties: {
    phase: { type: "string", description: "aktuálna fáza, napr. 'Predsezóna'" },
    summary: { type: "string", description: "2–3 vety: zameranie na túto fázu podľa postu" },
    teamTrainingFocus: {
      type: "array",
      items: { type: "string" },
      description: "na čo sa zamerať na spoločných tréningoch (podľa postu a fázy)",
    },
    individualSessions: {
      type: "array",
      items: SESSION_SCHEMA,
      description: "individuálne tréningy – čo a kedy trénovať sám (mimo spoločných tréningov, bez preťaženia)",
    },
    recoveryTips: {
      type: "array",
      items: { type: "string" },
      description: "regenerácia, mobilita, prevencia zranení",
    },
    ...REVIEW_PROP,
  },
  required: [
    "phase",
    "summary",
    "teamTrainingFocus",
    "individualSessions",
    "recoveryTips",
    "reviewAfterDays",
    "guidance",
  ],
  additionalProperties: false,
};

const FOOTBALL_SYSTEM = `Si špičkový futbalový tréner a kondičný špecialista. Radíš hráčovi na mieru podľa jeho POSTU, úrovne ligy a fázy sezóny.

VÝSTUP:
- phase: urči fázu z dátumov (dnes, začiatok sezóny, najbližšie zápasy).
- summary: 2–3 vety zamerania na túto fázu podľa postu.
- teamTrainingFocus: konkrétne veci, na ktoré sa má na SPOLOČNÝCH tréningoch zamerať (herné princípy, súboje, prihrávky, presúvanie, komunikácia) – podľa postu.
- individualSessions: individuálne tréningy MIMO spoločných – čo a kedy trénovať sám (technika, šprinty, zakončenie, hra hlavou, slabšia noha…). Zohľadni rozvrh, aby si sa nepreťažil a nezasiahol do zápasovej sviežosti. Ku každému drilu daj konkrétny detail (série/opakovania/čas).
- recoveryTips: regenerácia, mobilita, prevencia zranení podľa záťaže.

PRAVIDLÁ:
- Všetko špecifické pre jeho POST (napr. obranca vs krídelník vs stredopoliar).
- Predsezóna: budovanie kondície, objem, technika; blízko zápasu: sviežosť, menej objemu; sezóna: udržiavanie + doladenie detailov.
- Nezaťažuj nohy ťažko tesne pred zápasom/spoločným tréningom.
- MEDZISEZÓNNA PRESTÁVKA (pozri SEZÓNNA FÁZA v kontexte): ak je v prestávke, objem a zameranie prispôsob dĺžke do reštartu ligy – na začiatku dlhšej prestávky viac objemu/techniky/kondičného základu, v posledných 2–4 týždňoch pred reštartom zvyšuj intenzitu/rýchlosť/hernú kondíciu smerom k zápasovému tempu.
- POČASIE (pozri POČASIE DNES v kontexte): rozhoduj o VONKAJŠÍCH drilloch (šprinty, vytrvalostný/intervalový beh) podľa REÁLNEHO počasia, NIE podľa toho, že je kalendárovo "zima". Chladno ale suché/bez ľadu/snehu → vonku v pohode (len dlhšia rozcvička). Mráz s poľadovicou, sneh, intenzívny dážď/búrka → v detaile drilu daj jasnú alternatívu (hala, bežiaci pás, kryté priestory) namiesto vonkajšieho behu. V lete pri vysokých teplotách (>28 °C)/vysokom UV odporuč tréning skorého rána/večera a viac pitia.

AKTUÁLNY STAV / BOLESTI (ak je uvedený):
- PRISPÔSOB drily – vynechaj alebo uprav to, čo dráždi bolestivé miesto (napr. pri bolesti členka menej obratov s loptou, viac ľahkého behu ak to nebolí).
- V "guidance" napíš najpravdepodobnejšiu príčinu, ako postupovať a čím regenerovať, a KEDY vyhľadať lekára/fyzioterapeuta (opuch, ostrá bolesť, nelepší sa). VŽDY dodaj, že to nie je lekárska diagnóza.

ROZVRH (dôležité):
- Futbalové TÍMOVÉ tréningy a zápasy z rozvrhu sú FIXNÉ – NEMEŇ ich. Individuálne tréningy rozvrhni na OSTATNÉ dni tak, aby si nebol unavený pred tímovým tréningom/zápasom, a podľa KOORDINÁCIE aj mimo dní, ktoré už zabral gym modul.
- Počet individuálnych tréningov urči podľa rozpočtu v sekcii KOORDINÁCIA TÝŽDENNÉHO PROGRAMU nižšie (nie podľa vlastného odhadu).
- Každej session priraď presný "dayOfWeek" (0=nedeľa…6=sobota). Časovanie a detaily daj do "title"/"focus".
- NEPREDpisuj klasický posilňovací/gym tréning (drepy, mŕtvy ťah, tlaky s činkami…) – SILU a gym rieši SAMOSTATNÝ Fitness modul. Ty sa venuj len FUTBALU: technika, práca s loptou, šprinty, výbušnosť, agility, kondícia, regenerácia. Gym dni nechaj na Fitness modul.
- Neuvádzaj konkrétne kalórie ani makrá – tie rieši samostatný jedálniček.

PLATNOSŤ A ODPORÚČANIA:
- "reviewAfterDays" = po koľkých dňoch plán obnoviť (podľa fázy, typicky 14–28; kratšie pri zranení/pred zápasom).
- "guidance" = 2–4 konkrétne odporúčania ako postupovať počas tohto obdobia a kedy niečo zmeniť.
- V drilloch daj DETAILNÝ postup, aby ich hráč vedel spraviť aj sám bez trénera.

- Realistické, vykonateľné amatérom/poloprofesionálom. Po slovensky. Odpovedaj VÝHRADNE cez schému.

${TRAINING_KNOWLEDGE}`;

export async function generateFootballPlan(
  userId: string,
  startDateStr?: string,
): Promise<{ result: AiFootballResult; context: string; model: string }> {
  const context = await gatherAthleteContext(userId, "FOOTBALL", startDateStr);

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: FOOTBALL_SYSTEM,
    output_config: { format: { type: "json_schema", schema: FOOTBALL_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `${context}\n\nZostav futbalový plán na mieru pre aktuálnu fázu a môj post.`,
      },
    ],
  });

  if (res.stop_reason === "refusal") throw new Error("AI odmietlo požiadavku.");
  // Schéma vracia polia naplocho – zabalíme ich do plan.
  const parsed = JSON.parse(firstText(res.content)) as {
    phase: string;
    summary: string;
    reviewAfterDays: number;
    guidance: string[];
    teamTrainingFocus: string[];
    individualSessions: AiFootballSession[];
    recoveryTips: string[];
  };
  const result: AiFootballResult = {
    phase: parsed.phase,
    summary: parsed.summary,
    reviewAfterDays: parsed.reviewAfterDays,
    guidance: parsed.guidance ?? [],
    plan: {
      teamTrainingFocus: parsed.teamTrainingFocus ?? [],
      individualSessions: parsed.individualSessions ?? [],
      recoveryTips: parsed.recoveryTips ?? [],
    },
  };
  return { result, context, model: MODEL };
}
