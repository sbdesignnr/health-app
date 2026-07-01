import { anthropic } from "./anthropic";

// AI odhad nutričných hodnôt (na 100 g), keď OFF nemá dáta alebo sú neúplné.
export type EstimatedMacros = {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: "low" | "medium" | "high";
  assumptions: string;
};

const SCHEMA = {
  type: "object",
  properties: {
    caloriesKcal: { type: "number", description: "kcal na 100 g" },
    proteinG: { type: "number", description: "bielkoviny v g na 100 g" },
    carbsG: { type: "number", description: "sacharidy v g na 100 g" },
    fatG: { type: "number", description: "tuky v g na 100 g" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    assumptions: { type: "string", description: "krátke zdôvodnenie / predpoklady" },
  },
  required: ["caloriesKcal", "proteinG", "carbsG", "fatG", "confidence", "assumptions"],
  additionalProperties: false,
};

const SYSTEM_PROMPT =
  "Si presná nutričná databáza. Na základe názvu produktu (a značky/kategórie, ak sú dané) " +
  "odhadni typické nutričné hodnoty na 100 g jedlého podielu. Vychádzaj z bežných hodnôt pre " +
  "daný typ produktu a značku. Hodnoty uveď v gramoch a kcal. Odpovedaj IBA cez štruktúrovanú schému.";

export async function estimateMacros(input: {
  name: string;
  brand?: string | null;
  category?: string | null;
}): Promise<EstimatedMacros> {
  const lines = [`Produkt: ${input.name}`];
  if (input.brand) lines.push(`Značka: ${input.brand}`);
  if (input.category) lines.push(`Kategória: ${input.category}`);

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: lines.join("\n") }],
  });

  if (res.stop_reason === "refusal") {
    throw new Error("AI odmietlo požiadavku (refusal).");
  }

  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("AI nevrátilo textovú odpoveď.");
  }

  return JSON.parse(block.text) as EstimatedMacros;
}
