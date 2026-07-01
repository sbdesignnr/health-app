import { anthropic } from "./anthropic";

const MODEL = "claude-sonnet-4-6";

export type VisionMenuItem = {
  dayOfWeek?: number;
  name: string;
  description?: string;
  priceEur?: number;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

const MENU_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dayOfWeek: { type: "integer", description: "deň: 1=Po,2=Ut,3=St,4=Št,5=Pi,6=So,0=Ne; vynechaj ak nie je uvedený" },
          name: { type: "string" },
          description: { type: "string" },
          priceEur: { type: "number" },
          caloriesKcal: { type: "number", description: "odhad pre bežnú porciu jedla" },
          proteinG: { type: "number" },
          carbsG: { type: "number" },
          fatG: { type: "number" },
        },
        required: ["name", "caloriesKcal", "proteinG", "carbsG", "fatG"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

const MENU_SYSTEM = `Si nutričný špecialista. Z fotky obedového menu reštaurácie prepíš jednotlivé jedlá.
Pre každé jedlo: ak je uvedený deň v týždni, urči dayOfWeek (1=Po … 6=So, 0=Ne; inak vynechaj), názov po slovensky, cenu v € ak je uvedená, a ODHADNI nutričné hodnoty (kcal a makrá) pre bežnú reštauračnú porciu.
Polievky a prílohy spoj k hlavnému jedlu, ak tvoria menu. Odpovedaj VÝHRADNE cez štruktúrovanú schému.`;

export async function parseMenuPhoto(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
): Promise<VisionMenuItem[]> {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: MENU_SYSTEM,
    output_config: { format: { type: "json_schema", schema: MENU_SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Prepíš toto obedové menu na štruktúrované položky s odhadom makier." },
        ],
      },
    ],
  });

  if (res.stop_reason === "refusal") throw new Error("AI odmietlo požiadavku.");
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("AI nevrátilo menu.");
  return (JSON.parse(block.text) as { items: VisionMenuItem[] }).items;
}

const DISH_SCHEMA = {
  type: "object",
  properties: {
    caloriesKcal: { type: "number" },
    proteinG: { type: "number" },
    carbsG: { type: "number" },
    fatG: { type: "number" },
  },
  required: ["caloriesKcal", "proteinG", "carbsG", "fatG"],
  additionalProperties: false,
};

// Odhad makier pre jedno reštauračné jedlo (bežná porcia).
export async function estimateDishMacros(name: string): Promise<{
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}> {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    system:
      "Si nutričný špecialista. Odhadni nutričné hodnoty (kcal a makrá) pre bežnú reštauračnú porciu daného jedla. Odpovedaj len cez schému.",
    output_config: { format: { type: "json_schema", schema: DISH_SCHEMA } },
    messages: [{ role: "user", content: `Jedlo: ${name}` }],
  });

  if (res.stop_reason === "refusal") throw new Error("AI odmietlo požiadavku.");
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("AI nevrátilo odhad.");
  return JSON.parse(block.text);
}
