import { anthropic } from "./anthropic";
import { prisma } from "./prisma";

const MODEL = "claude-sonnet-4-6";
const MEAL_TYPES = ["BREAKFAST", "MORNING_SNACK", "LUNCH", "AFTERNOON_SNACK", "DINNER"] as const;
type MealTypeLit = (typeof MEAL_TYPES)[number];

const r1 = (n: number) => Math.round(n * 10) / 10;

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          mealType: { type: "string", enum: MEAL_TYPES },
          name: { type: "string", description: "názov potraviny po slovensky" },
          portionG: { type: "number", description: "veľkosť porcie v gramoch" },
          caloriesKcal: { type: "number", description: "kcal pre túto porciu" },
          proteinG: { type: "number" },
          carbsG: { type: "number" },
          fatG: { type: "number" },
        },
        required: ["mealType", "name", "portionG", "caloriesKcal", "proteinG", "carbsG", "fatG"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

export type VoiceLogged = { name: string; mealType: string; kcal: number; portionG: number };

export async function parseAndLogVoice(
  userId: string,
  text: string,
  mealHint?: string,
): Promise<VoiceLogged[]> {
  const system = `Si nutričný asistent. Z nadiktovaného popisu jedla vytiahni jednotlivé potraviny, urči gramáž porcie a odhadni realistické makrá (kcal, bielkoviny, sacharidy, tuky) pre TÚ konkrétnu porciu.
- Ak používateľ povie jedlo dňa (raňajky, desiata, obed, olovrant, večera), priraď zodpovedajúci mealType. ${mealHint ? `Ak to nepovie, použi ${mealHint}.` : "Ak to nepovie, zvoľ najvhodnejšie podľa jedla."}
- Ak povie počet kusov (napr. 3 vajcia), preveď na gramáž.
- Po slovensky. Odpovedaj VÝHRADNE cez štruktúrovanú schému.`;

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: text }],
  });

  if (res.stop_reason === "refusal") throw new Error("AI odmietlo požiadavku.");
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("AI nevrátilo odpoveď.");
  const items = (JSON.parse(block.text) as {
    items: {
      mealType: MealTypeLit;
      name: string;
      portionG: number;
      caloriesKcal: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
    }[];
  }).items;

  const logged: VoiceLogged[] = [];
  for (const it of items) {
    if (!it.name?.trim()) continue;
    const portionG = it.portionG > 0 ? it.portionG : 100;
    const per100 = 100 / portionG;
    const food = await prisma.food.create({
      data: {
        userId,
        source: "AI_ESTIMATED",
        barcode: null,
        name: it.name.trim(),
        caloriesKcal: r1(it.caloriesKcal * per100),
        proteinG: r1(it.proteinG * per100),
        carbsG: r1(it.carbsG * per100),
        fatG: r1(it.fatG * per100),
        servingSizeG: portionG,
      },
    });
    await prisma.foodLog.create({
      data: {
        userId,
        foodId: food.id,
        mealType: it.mealType,
        portionG,
        caloriesKcal: Math.round(it.caloriesKcal),
        proteinG: r1(it.proteinG),
        carbsG: r1(it.carbsG),
        fatG: r1(it.fatG),
        loggedAt: new Date(),
      },
    });
    logged.push({ name: it.name.trim(), mealType: it.mealType, kcal: Math.round(it.caloriesKcal), portionG });
  }
  return logged;
}
