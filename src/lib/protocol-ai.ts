import { anthropic } from "./anthropic";
import { prisma } from "./prisma";
import { listFavorites } from "./favorites";

const MODEL = "claude-sonnet-4-6";

export type ProtocolSupplement = { name: string; timing: string; reason: string };

export type ProtocolResult = {
  title: string;
  focus: string;
  rationale: string;
  durationDays: number;
  principles: string[];
  emphasizeFoods: string[];
  avoidFoods: string[];
  supplements: ProtocolSupplement[];
  expectations: string;
  model: string;
};

const SUPP_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    timing: { type: "string", description: "kedy užívať" },
    reason: { type: "string", description: "prečo pri tomto stave" },
  },
  required: ["name", "timing", "reason"],
  additionalProperties: false,
};

const PROTOCOL_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "krátky výstižný názov protokolu po slovensky" },
    focus: { type: "string", description: "hlavný cieľ protokolu v jednej vete" },
    rationale: {
      type: "string",
      description:
        "2–4 vety – fyziologické vysvetlenie, PREČO tento prístup pomôže pri jeho stave (napr. mechanizmus na koži/čreve/hormónoch). Odborné, ale zrozumiteľné.",
    },
    durationDays: {
      type: "integer",
      description:
        "realistická doba dodržiavania v dňoch, kým sa prejaví efekt (napr. črevo/pokožka 21–42 dní, ľahšia úprava 10–14 dní). Buď realistický, nie prehnaný.",
    },
    principles: {
      type: "array",
      items: { type: "string" },
      description: "4–7 konkrétnych zásad protokolu (čo denne robiť/ako jesť). Konkrétne, akčné.",
    },
    emphasizeFoods: {
      type: "array",
      items: { type: "string" },
      description:
        "potraviny/skupiny, ktoré cielene zaraďovať, každá s krátkym PREČO (napr. „kefír a kyslá kapusta – probiotiká pre obnovu mikrobiómu“)",
    },
    avoidFoods: {
      type: "array",
      items: { type: "string" },
      description:
        "potraviny/skupiny, ktorým sa počas protokolu vyhnúť alebo obmedziť, každá s krátkym PREČO (napr. „vyprážané a fritézové jedlá – zápalový spúšťač akné“)",
    },
    supplements: {
      type: "array",
      items: SUPP_SCHEMA,
      description: "voliteľné doplnky relevantné pre tento stav (napr. omega-3, zinok, probiotiká) – kedy a prečo",
    },
    expectations: {
      type: "string",
      description: "1–2 vety – čo môže reálne čakať a kedy (aby vedel, či to funguje). Bez preháňania.",
    },
  },
  required: [
    "title",
    "focus",
    "rationale",
    "durationDays",
    "principles",
    "emphasizeFoods",
    "avoidFoods",
    "supplements",
    "expectations",
  ],
  additionalProperties: false,
};

const SYSTEM = `Si špičkový funkčný nutričný špecialista a fyziológ, ktorý navrhuje cielené výživové protokoly na mieru podľa aktuálneho stavu športovca.

ÚLOHA:
- Používateľ opíše svoj aktuálny stav (napr. akné z ťažkých jedál, potreba upokojiť črevný mikrobióm, nafúknuté brucho, únava, chuť schudnúť pár kíl…).
- Ty navrhni KONKRÉTNY protokol: jasný cieľ, fyziologické zdôvodnenie, realistickú dobu dodržiavania, zásady, potraviny na zaradenie a na vyhnutie sa, relevantné doplnky a čo môže čakať.

PRINCÍPY (dôležité):
- Vždy vychádzaj z reálnej fyziológie a výživy (mikrobióm, zápal, glykémia, hormóny, koža–črevo os, regenerácia). Buď odborný, ale konkrétny a akčný.
- Odporúčania musia byť CHUTNÉ a realistické – žiadne suché „diétne“ jedlá. Zohľadni, že neznáša suché jedlá.
- Rešpektuj jeho alergie, typ stravy a „nemám rád/nejem“ z kontextu. Nič z alergií nikdy neodporúčaj.
- Zohľadni, že je aktívny športovec (futbal + posilňovňa) – protokol nesmie podkopať výkon ani regeneráciu (dosť bielkovín, dosť energie okolo tréningov).
- Doba dodržiavania musí byť REALISTICKÁ pre daný cieľ – neprehováraj. Pri koži/čreve typicky 3–6 týždňov.
- Ber do úvahy jeho obľúbené jedlá a nákupné preferencie z kontextu – protokol nech sa čo najviac opiera o veci, ktoré reálne je a vie kúpiť.
- Zásady formuluj tak, aby sa dali priamo premietnuť do denných jedálničkov.

Odpovedaj VÝHRADNE cez štruktúrovanú schému, po slovensky.`;

async function gatherProtocolContext(userId: string, stateText: string): Promise<string> {
  const [user, favorites] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    listFavorites(userId),
  ]);

  const lines: string[] = [];
  lines.push("AKTUÁLNY STAV POUŽÍVATEĽA (na toto navrhni protokol):");
  lines.push(`"${stateText.trim()}"`);
  lines.push("");

  lines.push("PROFIL:");
  if (user?.dietType) lines.push(`- typ stravy: ${user.dietType}`);
  if (user?.allergies?.length) lines.push(`- ALERGIE (nikdy nezaraď): ${user.allergies.join(", ")}`);
  if (user?.dislikes?.length) lines.push(`- nemá rád / nejem: ${user.dislikes.join(", ")}`);
  if (user?.healthConcerns?.length) lines.push(`- dlhodobé zdravotné okruhy: ${user.healthConcerns.join(", ")}`);
  if (user?.healthNotes) lines.push(`- poznámky k zdraviu: ${user.healthNotes}`);
  if (user?.supplements?.length) lines.push(`- doplnky, ktoré už užíva: ${user.supplements.join(", ")}`);
  lines.push("- je aktívny športovec: futbal + posilňovňa");
  lines.push("");

  if (user?.foodRules?.trim()) {
    lines.push("NÁKUPNÉ PREFERENCIE (opieraj sa o ne):");
    lines.push(user.foodRules.trim());
    lines.push("");
  }

  if (favorites.length > 0) {
    lines.push("OBĽÚBENÉ JEDLÁ (ktoré reálne je – protokol nech ich zohľadní):");
    for (const f of favorites.filter((x) => x.active)) {
      lines.push(`- ${f.name}`);
    }
  }

  return lines.join("\n");
}

export async function generateProtocol(userId: string, stateText: string): Promise<ProtocolResult> {
  const context = await gatherProtocolContext(userId, stateText);

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: PROTOCOL_SCHEMA } },
    messages: [
      { role: "user", content: `${context}\n\nNavrhni cielený výživový protokol na tento stav.` },
    ],
  });

  if (res.stop_reason === "refusal") throw new Error("AI odmietlo požiadavku.");
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text" || !block.text) throw new Error("AI nevrátilo odpoveď.");

  const parsed = JSON.parse(block.text) as Omit<ProtocolResult, "model">;
  // strážne mantinely na dĺžku protokolu
  const durationDays = Math.max(5, Math.min(90, Math.round(parsed.durationDays || 21)));
  return { ...parsed, durationDays, model: MODEL };
}
