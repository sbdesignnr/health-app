import { anthropic } from "./anthropic";
import { prisma } from "./prisma";

const MODEL = "claude-sonnet-4-6";

export type AiExercise = {
  name: string;
  sets: number;
  reps: string;
  intensity: string;
  restSec: number;
  notes: string;
};
export type AiDay = { title: string; focus: string; exercises: AiExercise[] };
export type AiProgram = { phase: string; summary: string; days: AiDay[] };

const EX_PROPS = {
  name: { type: "string", description: "názov cviku po slovensky" },
  sets: { type: "integer", description: "počet sérií" },
  reps: { type: "string", description: "opakovania, napr. '8–10', '5' alebo 'AMRAP'" },
  intensity: { type: "string", description: "intenzita, napr. 'RPE 8', '75 % 1RM' alebo 'stredná'" },
  restSec: { type: "integer", description: "odpočinok medzi sériami v sekundách" },
  notes: { type: "string", description: "krátka poznámka k technike alebo prevedeniu (môže byť prázdna)" },
};
const EX_REQUIRED = ["name", "sets", "reps", "intensity", "restSec", "notes"];

const DAY_PROPS = {
  title: { type: "string", description: "názov dňa, napr. 'Deň 1 – Dolná časť (sila)'" },
  focus: { type: "string", description: "krátke zameranie dňa" },
  exercises: {
    type: "array",
    items: { type: "object", properties: EX_PROPS, required: EX_REQUIRED, additionalProperties: false },
  },
};
const DAY_REQUIRED = ["title", "focus", "exercises"];

const PROGRAM_SCHEMA = {
  type: "object",
  properties: {
    phase: { type: "string", description: "aktuálna tréningová fáza, napr. 'Predsezóna – budovanie sily'" },
    summary: { type: "string", description: "2–3 vety: zameranie programu a ako pomáha futbalu v tejto fáze" },
    days: {
      type: "array",
      items: { type: "object", properties: DAY_PROPS, required: DAY_REQUIRED, additionalProperties: false },
    },
  },
  required: ["phase", "summary", "days"],
  additionalProperties: false,
};

const SYSTEM = `Si špičkový kondičný tréner (strength & conditioning) pre futbalistov. Tvoríš gym program na mieru, ktorý buduje svalovú hmotu a silu, ALE zároveň zlepšuje futbalový výkon (výbušnosť, rýchlosť, stabilita, prevencia zranení).

PERIODIZÁCIA PODĽA FÁZY (kľúčové – urči fázu z dátumov):
- Prípravné obdobie / predsezóna: väčší objem, budovanie sily a hypertrofie, viac záťaže na nohy, plus rozvoj výbušnosti.
- Blízko dôležitého zápasu (napr. pohár): zníž objem, udrž intenzitu, odľahči nohy 2–3 dni pred zápasom (tapering).
- Sezóna (in-season): udržiavací režim, menší objem, dôraz na silu/výbušnosť a regeneráciu, aby tréning nezhoršil zápasový výkon.

PRAVIDLÁ:
- Vytvor presne toľko tréningových dní, koľko chodí do gymu (gymDaysPerWeek). Ak nie je uvedené, daj 3–4.
- NEDÁVAJ ťažké nohy tesne pred futbalovým tréningom/zápasom – rozlož záťaž podľa rozvrhu.
- Zaraď: viackĺbové cviky (drep, mŕtvy ťah, tlaky, príťahy), posteriorný reťazec (hamstringy, sedacie – dôležité pre šprint a prevenciu), unilaterálne cviky (výpady, bulharské drepy), výbušnosť/plyometria (pre futbal), core a prevenciu (členky, kolená).
- Ku každému cviku: série, opakovania, intenzita (RPE alebo % 1RM), odpočinok a krátka poznámka.
- Prispôsob náročnosť skúsenostiam (trainingExperience) a pozícii.
- Názvy cvikov po slovensky. Odpovedaj VÝHRADNE cez štruktúrovanú schému.`;

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

async function gatherAthleteContext(userId: string): Promise<string> {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [user, goal, events] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.goal.findFirst({ where: { userId, validTo: null }, orderBy: { validFrom: "desc" } }),
    prisma.scheduleEvent.findMany({ where: { userId } }),
  ]);

  const lines: string[] = [];
  lines.push(`DNES: ${todayStr}`);
  lines.push("");
  lines.push("PROFIL:");
  lines.push(
    `- Vek: ${ageFrom(user?.birthDate) ?? "?"} r., Výška: ${user?.heightCm ?? "?"} cm, Váha: ${user?.currentWeightKg ?? "?"} kg`,
  );
  lines.push(`- Cieľ: ${GOAL_SK[goal?.type ?? ""] ?? "udržanie + výkon"}`);
  lines.push(`- Skúsenosti v posilňovni: ${user?.trainingExperience || "neuvedené"}`);
  lines.push(`- Počet gym tréningov/týždeň (vytvor toľko dní): ${user?.gymDaysPerWeek ?? "neuvedené (daj 3–4)"}`);
  lines.push("");
  lines.push("FUTBAL:");
  lines.push(`- Liga: ${user?.footballLeague || "neuvedené"}, Post: ${user?.footballPosition || "neuvedené"}`);
  lines.push(
    `- Odohrané roky: ${user?.yearsPlaying ?? "?"}, Dĺžka zápasu: ${user?.matchMinutes ?? "?"} min, Silná noha: ${user?.dominantFoot || "?"}`,
  );
  lines.push(
    `- Začiatok sezóny: ${user?.seasonStartDate ? user.seasonStartDate.toISOString().slice(0, 10) : "neuvedené"}`,
  );
  lines.push("");
  lines.push("CIELE A FORMA (personalizuj presne podľa toho):");
  lines.push(`- Ciele do sezóny: ${user?.seasonGoals?.trim() || "neuvedené"}`);
  lines.push(`- Silné stránky: ${user?.strengths?.trim() || "neuvedené"}`);
  lines.push(`- Slabiny na zlepšenie (cielene ich adresuj): ${user?.weaknesses?.trim() || "neuvedené"}`);
  lines.push(`- Zranenia / obmedzenia (REŠPEKTUJ, neublíž, obchádzaj): ${user?.injuries?.trim() || "žiadne uvedené"}`);
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

  return lines.join("\n");
}

function firstText(content: { type: string; text?: string }[]): string {
  const block = content.find((b) => b.type === "text");
  if (!block || block.type !== "text" || !block.text) throw new Error("AI nevrátilo odpoveď.");
  return block.text;
}

export async function generateGymProgram(
  userId: string,
): Promise<{ program: AiProgram; context: string; model: string }> {
  const context = await gatherAthleteContext(userId);

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
export type AiFootballSession = { day: string; title: string; focus: string; drills: AiDrill[] };
export type AiFootballPlan = {
  teamTrainingFocus: string[];
  individualSessions: AiFootballSession[];
  recoveryTips: string[];
};
export type AiFootballResult = { phase: string; summary: string; plan: AiFootballPlan };

const DRILL_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "názov cvičenia po slovensky" },
    detail: { type: "string", description: "ako to spraviť – série/opakovania/čas, prevedenie" },
  },
  required: ["name", "detail"],
  additionalProperties: false,
};
const SESSION_SCHEMA = {
  type: "object",
  properties: {
    day: { type: "string", description: "deň, napr. 'Utorok' alebo 'Voľný deň'" },
    title: { type: "string", description: "názov individuálneho tréningu" },
    focus: { type: "string", description: "krátke zameranie" },
    drills: { type: "array", items: DRILL_SCHEMA },
  },
  required: ["day", "title", "focus", "drills"],
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
  },
  required: ["phase", "summary", "teamTrainingFocus", "individualSessions", "recoveryTips"],
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
- Realistické, vykonateľné amatérom/poloprofesionálom. Po slovensky. Odpovedaj VÝHRADNE cez schému.`;

export async function generateFootballPlan(
  userId: string,
): Promise<{ result: AiFootballResult; context: string; model: string }> {
  const context = await gatherAthleteContext(userId);

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
  const parsed = JSON.parse(firstText(res.content)) as AiFootballResult;
  return { result: parsed, context, model: MODEL };
}
