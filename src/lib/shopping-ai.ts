import { anthropic } from "./anthropic";
import { prisma } from "./prisma";
import { listFavorites } from "./favorites";

const MODEL = "claude-sonnet-4-6";

export type ShopItem = {
  name: string;
  product: string;
  amount: string;
  priceEur: number;
  why: string;
  checked?: boolean;
};
export type ShopGroup = { shop: string; items: ShopItem[]; subtotalEur: number };
export type ShoppingResult = {
  groups: ShopGroup[];
  totalEur: number;
  note: string;
  budgetNote: string;
  model: string;
};

const ITEM_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "surovina všeobecne, napr. „kuracie prsia“" },
    product: {
      type: "string",
      description:
        "KONKRÉTNY produkt v danom obchode vrátane značky, ak ju poznáš (napr. „Kánia kuracie prsia chladené“). Ak si značkou nie si istý, uveď presný typ produktu a na čo si dať pozor pri výbere.",
    },
    amount: { type: "string", description: "množstvo na celý týždeň, napr. „1,4 kg“, „10 ks“, „500 ml“" },
    priceEur: { type: "number", description: "odhad ceny za toto množstvo v eurách" },
    why: {
      type: "string",
      description:
        "stručne prečo práve tento produkt/značka (kvalita, zloženie, pomer cena/výkon). Pri prémiových veciach z Yeme povinne konkrétny dôvod.",
    },
  },
  required: ["name", "product", "amount", "priceEur", "why"],
  additionalProperties: false,
};

const SHOPPING_SCHEMA = {
  type: "object",
  properties: {
    groups: {
      type: "array",
      description: "nákup rozdelený podľa obchodov, v poradí Lidl → Kaufland → Yeme",
      items: {
        type: "object",
        properties: {
          shop: { type: "string", description: "Lidl / Kaufland / Yeme" },
          items: { type: "array", items: ITEM_SCHEMA },
          subtotalEur: { type: "number", description: "súčet cien položiek v tomto obchode" },
        },
        required: ["shop", "items", "subtotalEur"],
        additionalProperties: false,
      },
    },
    totalEur: { type: "number", description: "celková cena nákupu" },
    note: {
      type: "string",
      description: "2–4 vety: čo z toho vydrží na viac týždňov, čo kúpiť čerstvé na konkrétny deň, tipy na skladovanie",
    },
    budgetNote: {
      type: "string",
      description: "jedna veta o tom, ako nákup sedí do rozpočtu 50–60 € (a čo škrtnúť, ak presahuje)",
    },
  },
  required: ["groups", "totalEur", "note", "budgetNote"],
  additionalProperties: false,
};

const SYSTEM = `Si skúsený nutričný poradca a zároveň človek, ktorý dokonale pozná slovenské obchody Lidl, Kaufland a Yeme.
Tvojou úlohou je z jedálničkov na nasledujúce dni zostaviť JEDEN týždenný nákupný zoznam.

PRAVIDLÁ:
- Zosumarizuj rovnaké suroviny naprieč všetkými dňami do JEDNEJ položky (napr. kuracie prsia zo 4 jedál = 1,4 kg spolu). Pripočítaj ~10 % rezervu na odrezky a odchýlky váženia.
- Rozdeľ nákup podľa obchodov v poradí priority: Lidl (základ – mäso, zelenina, ovocie, mliečne, trvanlivé) → Kaufland (hovädzí steak, čerstvý losos, špecialitky) → Yeme (len prémiové veci: med, farmárske vajcia, čokoláda 85 %+, A2 mlieko).
- Pri KAŽDEJ položke odporuč KONKRÉTNY PRODUKT v danom obchode – ideálne aj so značkou (napr. Lidl: Kánia, Pikok, Milbona, Primadonna, Combino, Freeway; Kaufland: K-Classic, K-Purland, K-Bio; Yeme: slovenské farmárske a remeselné značky). Neobmedzuj sa len na produkty vymenované v jeho preferenciách – pokojne odporuč ďalšie, ktoré tam nie sú, ak sú kvalitatívne alebo cenovo lepšie.
- DÔLEŽITÉ: ak si presným názvom značky nie si istý, NEVYMÝŠĽAJ si ho. Namiesto toho napíš presný typ produktu a na čo pri výbere pozerať (napr. „olivový olej extra virgin, sklenená fľaša, kyslosť do 0,5 %“). Radšej presný popis než vymyslená značka.
- V poli "why" vysvetli, prečo práve tento produkt – pri bežných veciach stačí pomer cena/kvalita, pri prémiových z Yeme povinne konkrétny dôvod (napr. farmárske vajcia – oranžovejší žĺtok, viac omega-3).
- Rešpektuj jeho KVALITNÉ SUBSTITÚCIE: med slovenský lesný/kvetový (nie supermarketový), vajcia farmárske, čokoláda min. 85 %, olej olivový/kokosový extra virgin (nikdy slnečnicový), mlieko A2 plnotučné (nie odtučnené).
- Ceny odhaduj realisticky podľa aktuálnych slovenských cien. Uveď cenu za NAKUPOVANÉ množstvo, nie za kilo.
- Cieľový rozpočet je 50–60 € celkovo (Lidl+Kaufland ~47–50 €, Yeme ~5–8 €). Ak nákup presahuje, v budgetNote konkrétne napíš, čo vymeniť alebo škrtnúť.
- Suroviny označené ako „vždy doma“ (základné korenia, soľ, olej ak ešte je) nepridávaj, ak ich netreba dokúpiť – radšej ich vynechaj a spomeň v note.
- Zohľadni, čo z nákupu vydrží dlhšie (ryža, olej, med) – tie netreba kupovať každý týždeň.
- Odpovedaj VÝHRADNE cez štruktúrovanú schému, po slovensky.`;

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Zozbiera jedálničky v rozsahu + obľúbené jedlá a pravidlá nákupu. */
async function gatherShoppingContext(userId: string, from: string, to: string): Promise<string> {
  const [user, plans, favorites] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { foodRules: true } }),
    prisma.mealPlan.findMany({
      where: { userId, date: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T00:00:00Z`) } },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { date: "asc" },
    }),
    listFavorites(userId),
  ]);

  const lines: string[] = [];
  lines.push(`OBDOBIE NÁKUPU: ${from} až ${to}`);
  lines.push("");
  lines.push("NÁKUPNÉ PREFERENCIE A PRAVIDLÁ (prísne dodrž):");
  lines.push(user?.foodRules?.trim() || "- neuvedené");
  lines.push("");

  if (plans.length > 0) {
    lines.push("NAPLÁNOVANÉ JEDLÁ (z nich vyskladaj nákup):");
    for (const p of plans) {
      lines.push(`— ${dateStr(p.date)}:`);
      for (const it of p.items) {
        const ing = (it.ingredients as { name: string; grams: number }[] | null) ?? [];
        const ingStr = ing.length
          ? ing.map((i) => `${i.name} ${Math.round(i.grams)} g`).join(", ")
          : "(bez rozpisu surovín)";
        lines.push(`   • ${it.name}: ${ingStr}`);
      }
    }
    lines.push("");
  }

  const plannedDays = plans.length;
  const totalDays = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  if (plannedDays < totalDays) {
    lines.push(
      `POZOR: jedálniček existuje len pre ${plannedDays} z ${totalDays} dní. Pre zvyšné dni odhadni nákup z jeho OBĽÚBENÝCH JEDÁL nižšie (bežné porcie, dodrž rotáciu mäsa a rýb).`,
    );
    lines.push("");
  }

  if (favorites.length > 0) {
    lines.push("OBĽÚBENÉ JEDLÁ (typické porcie a suroviny):");
    for (const f of favorites) {
      const ing = (f.ingredients ?? [])
        .map((i) => `${i.name} ${Math.round(i.grams)} g${i.shop ? ` [${i.shop}]` : ""}`)
        .join(", ");
      lines.push(`- ${f.name}${ing ? `: ${ing}` : ""}`);
    }
  }

  return lines.join("\n");
}

export async function generateShoppingList(
  userId: string,
  from: string,
  to: string,
): Promise<ShoppingResult> {
  const context = await gatherShoppingContext(userId, from, to);

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SHOPPING_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `${context}\n\nZostav jeden týždenný nákupný zoznam rozdelený podľa obchodov, s konkrétnymi produktmi a odhadom ceny.`,
      },
    ],
  });

  if (res.stop_reason === "refusal") throw new Error("AI odmietlo požiadavku.");
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text" || !block.text) throw new Error("AI nevrátilo odpoveď.");

  const parsed = JSON.parse(block.text) as Omit<ShoppingResult, "model">;
  return { ...parsed, model: MODEL };
}
